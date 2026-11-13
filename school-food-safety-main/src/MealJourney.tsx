import { useEffect, useState } from 'react'
import { Check, Clock3, ExternalLink, MapPin, QrCode, ShieldCheck, Timer, Utensils } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { DayData, School } from './lib/data'
import type { ViewRole } from './lib/store'
import { portionQrDemo, portionTraceUrl, subscribePortionQrUpdates } from './lib/portionQr'
import type { MealType } from '../packages/domain/portion-qr'
import readyServingDemo from './assets/ready-service-demo.jpg'
import breakfastDemo from './assets/dishes/porridge.svg'
import snackDemo from './assets/dishes/fruit.svg'

const centralSteps = [
  { status: 'DISPATCHED', label: 'Xuất bếp' },
  { status: 'ARRIVED', label: 'Đến trường' },
  { status: 'PLATED', label: 'Ra món' },
  { status: 'READY', label: 'Sẵn sàng phục vụ' },
]
const onSiteSteps = centralSteps.slice(2)

/**
 * Hành trình công khai dùng chung cho 5 vai trò, ở Tổng quan, Giám sát và Tiến trình.
 * Dùng DayData từ khóa (trường, ngày), tuyệt đối không lọc hoặc tạo dữ liệu theo vai trò.
 * Ảnh thực tế chỉ lấy từ DayData đã lọc quyền công khai; ảnh chưa duyệt không rò rỉ.
 */
export function MealJourneyProgress({
  data,
  mode,
  schoolId,
  serviceDate,
  mealType = 'LUNCH',
  role,
  onReadyPhotoClick,
}: {
  data: DayData
  mode: School['mode']
  schoolId?: string
  serviceDate?: string
  mealType?: MealType
  role?: ViewRole
  onReadyPhotoClick: () => void
}) {
  const [, setQrRevision] = useState(0)
  useEffect(() => subscribePortionQrUpdates(() => setQrRevision(value => value + 1)), [])
  const steps = mode === 'CENTRAL_KITCHEN'
    ? role === 'school_kitchen' ? centralSteps.filter(step => step.status !== 'ARRIVED') : centralSteps
    : onSiteSteps
  const entries = steps.map(step => ({ ...step, event: data.events.find(event => event.status === step.status) }))
  const lastConfirmed = [...entries].reverse().find(item => item.event?.confirmed)?.event
  const lastReported = [...entries].reverse().find(item => item.event)?.event
  const latest = lastConfirmed ?? lastReported
  const readyEvent = data.events.find(event => event.status === 'READY')
  const readyPhoto = readyEvent?.confirmed ? readyEvent.photos[0] : undefined
  const placeholderPhoto = mealType === 'BREAKFAST' ? breakfastDemo : mealType === 'SNACK' ? snackDemo : readyServingDemo
  let activePortions: ReturnType<typeof portionQrDemo.active> = []
  if (mode === 'CENTRAL_KITCHEN' && schoolId && serviceDate) {
    try {
      const currentDishes = new Set(data.dishes.map(dish => dish.trim().toLocaleLowerCase('vi-VN')))
      activePortions = portionQrDemo.active(portionQrDemo.scopeForSchool({ schoolId, serviceDate, mealType }))
        .filter(record => currentDishes.has(record.dishName.trim().toLocaleLowerCase('vi-VN')))
    }
    catch { /* QR chưa sẵn sàng được hiển thị bằng empty state, không suy diễn token. */ }
  }
  const samplePortion = activePortions[0]
  const portionDate = samplePortion ? new Date(`${samplePortion.serviceDate}T12:00:00`).toLocaleDateString('vi-VN') : null
  const mealLabel = mealType === 'BREAKFAST' ? 'Bữa sáng' : mealType === 'LUNCH' ? 'Bữa trưa' : 'Bữa xế'

  return <div className="journey-progress">
    <div className="journey-summary">
      <span className="live-dot"/>
      <div><strong>{latest?.label ?? 'Chưa có mốc vận hành'}</strong>
        <p>{!latest ? 'Chưa có bản ghi · Chờ đơn vị cập nhật' : lastConfirmed ? 'Mốc gần nhất đã xác nhận' : 'Đã báo cáo · Chờ Ban Giám hiệu xác nhận'}</p>
      </div>
      <Clock3 size={20}/>
    </div>
    <div className="timeline compact" aria-label="Nhật ký vận hành bữa ăn">
      {entries.map(({status,label,event}) => <div className="timeline-item" key={status}>
        <span className={`timeline-node ${event?.confirmed ? 'done' : 'pending'}`}>
          {event?.confirmed ? <Check size={14}/> : <Clock3 size={14}/>}
        </span>
        <div>
          <div className="timeline-title"><strong>{label}</strong><time>{event?.time ?? '—'}</time></div>
          <p>{event?.actor ?? 'Chưa có người ghi nhận'}</p>
          <span className={event?.confirmed ? 'confirmed-text' : 'pending-text'}>{!event ? 'Chưa ghi nhận' : event.confirmed ? 'Đã xác nhận' : 'Đã báo cáo · Chờ BGH xác nhận'}</span>
          {status === 'READY' && <div className="journey-ready-evidence">
            <button type="button" className="journey-ready-photo" onClick={onReadyPhotoClick} aria-label="Xem ảnh bước Sẵn sàng phục vụ">
              <img src={readyPhoto ?? placeholderPhoto} onError={e => {e.currentTarget.src=placeholderPhoto}} alt={readyPhoto ? 'Ảnh thực tế được duyệt công khai' : 'Ảnh minh họa DEMO tại bước Sẵn sàng phục vụ'} loading="lazy"/>
              <span><Utensils size={12}/>{readyPhoto ? 'Ảnh đã được xác nhận công khai (DEMO)' : 'Ảnh minh họa DEMO · Chưa có ảnh được duyệt'}</span>
            </button>
            {mode === 'CENTRAL_KITCHEN' && readyEvent?.confirmed && (samplePortion ? <a className="journey-ready-qr" href={portionTraceUrl(samplePortion.publicToken)} aria-label={`Mở chi tiết QR món ${samplePortion.dishName}`}>
              <span className="journey-ready-qr-code"><QRCodeSVG value={portionTraceUrl(samplePortion.publicToken)} size={104} level="M" marginSize={1}/></span>
              <span className="journey-ready-qr-copy"><small>QR TỪNG MÓN · DEMO</small><strong>{samplePortion.dishName}</strong><em>{mealLabel} · {portionDate}</em><em>{activePortions.length.toLocaleString('vi-VN')} món có QR</em><span>Quét xem hồ sơ riêng của món <ExternalLink size={12}/></span></span>
            </a> : <div className="journey-ready-qr-empty"><QrCode size={22}/><span><strong>QR từng món chưa được phát hành</strong><small>Bếp trung tâm cần phát hành đúng một QR cho mỗi món của bữa.</small></span></div>)}
          </div>}
        </div>
      </div>)}
    </div>
    <div className="journey-footer"><ShieldCheck size={17}/><p>Mỗi bước ghi nhận, thêm một phần an tâm.<br/><span>Trạng thái quy trình không thay kết luận ATTP.</span></p></div>
  </div>
}

/** Dùng đúng cùng giao diện nhật ký cho các vai trò ở mục Giám sát & an toàn. */
export function MealJourneyPanel({school, serviceDate, mealType='LUNCH', data, role, onReadyPhotoClick}: {
  school: School
  serviceDate?: string
  mealType?: MealType
  data: DayData
  role?: ViewRole
  onReadyPhotoClick: () => void
}) {
  return <section className="card detail-section shared-operation-journal" aria-label="Nhật ký vận hành dùng chung">
    <div className="card-header"><div>
      <div className="section-kicker">NHẬT KÝ VẬN HÀNH</div>
      <h2>{role === 'school_kitchen' ? 'Nhật ký chế biến và phục vụ tại trường' : school.mode === 'CENTRAL_KITCHEN' ? 'Từ bếp trung tâm đến trường' : 'Bữa ăn nấu tại trường'}</h2>
      <p className="muted shared-journal-context">Nhật ký riêng cho {mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'}, cùng nguồn dữ liệu công khai ở mọi vai trò</p>
    </div></div>
    {school.mode === 'CENTRAL_KITCHEN' && role !== 'school_kitchen' && <div className="transport-facts" aria-label="Thông tin vận chuyển từ bếp trung tâm đến trường">
      <div><span className="transport-icon"><MapPin size={18}/></span><span><small>Khoảng cách</small><strong>{data.transportDistanceKm !== null ? `${data.transportDistanceKm.toLocaleString('vi-VN')} km` : 'Chưa ghi nhận'}</strong></span></div>
      <div><span className="transport-icon"><Timer size={18}/></span><span><small>Thời gian vận chuyển</small><strong>{data.transportDurationMinutes !== null ? `${data.transportDurationMinutes} phút` : 'Chưa ghi nhận'}</strong></span></div>
    </div>}
    <MealJourneyProgress data={data} mode={school.mode} role={role} schoolId={school.id} serviceDate={serviceDate} mealType={mealType} onReadyPhotoClick={onReadyPhotoClick}/>
  </section>
}
