import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  CookingPot,
  FileCheck2,
  Image as ImageIcon,
  Leaf,
  PackageCheck,
  QrCode,
  Scale,
  School,
  ShieldCheck,
  Truck,
  Utensils,
} from 'lucide-react'
import { demoData, publicTraceLots, schools } from './lib/data'
import type { DayData, DishDetail, IngredientPortion } from './lib/data'
import { publicIngredientReceivingTrace } from './lib/inventory'
import { portionQrDemo } from './lib/portionQr'
import './PortionQr.css'

const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', {
  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
})

const dateTimeLabel = (value: string) => new Date(value).toLocaleString('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
})

function quantityLabel(amount: number, unit: IngredientPortion['unit'], servings: number) {
  const total = amount * servings
  if (total >= 1000) return `${(total / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit === 'g' ? 'kg' : 'lít'}`
  return `${total.toLocaleString('vi-VN')} ${unit}`
}

function MenuQuantity({ detail }: { detail: DishDetail }) {
  return <article className="portion-menu-card">
    <div className="portion-menu-head"><span><ChefHat size={18}/></span><div><h3>{detail.name}</h3><p>{detail.expectedServings.toLocaleString('vi-VN')} suất dự kiến</p></div><em>Chưa xác minh</em></div>
    <div className="portion-menu-metrics">
      <span><small>Định lượng món / suất</small><strong>{detail.servingWeightGrams === null ? 'Chưa khai báo' : `${detail.servingWeightGrams.toLocaleString('vi-VN')} g`}</strong></span>
      <span><small>Dinh dưỡng</small><strong>{detail.nutrition ? `${detail.nutrition.energyKcal.toLocaleString('vi-VN')} kcal` : 'Chưa xác minh'}</strong></span>
    </div>
    {detail.ingredients.length > 0 ? <div className="portion-ingredient-table" role="table" aria-label={`Định lượng nguyên liệu món ${detail.name}`}>
      <div className="portion-ingredient-row heading" role="row"><span role="columnheader">Nguyên liệu</span><span role="columnheader">Mỗi suất</span><span role="columnheader">Theo kế hoạch</span></div>
      {detail.ingredients.map((ingredient, index) => <div className="portion-ingredient-row" role="row" key={`${ingredient.name}-${index}`}>
        <span role="cell"><strong>{ingredient.name}</strong><small>{ingredient.supplier ?? 'Chưa liên kết nhà cung cấp'}{ingredient.lotCode ? ` · ${ingredient.lotCode}` : ''}</small></span>
        <span role="cell">{ingredient.amount.toLocaleString('vi-VN')} {ingredient.unit}</span>
        <span role="cell">{quantityLabel(ingredient.amount, ingredient.unit, detail.expectedServings)}</span>
      </div>)}
    </div> : <p className="portion-data-empty">Chưa có định lượng nguyên liệu được công khai cho món này.</p>}
  </article>
}

function TraceDetails({ record, data }: {
  record: NonNullable<ReturnType<typeof portionQrDemo.findPublic>>['record']
  data: DayData
}) {
  const dishDetails = data.dishDetails.filter(detail => detail.name.toLocaleLowerCase('vi-VN') === record.dishName.toLocaleLowerCase('vi-VN'))
  const ingredients = dishDetails.flatMap(detail => detail.ingredients.map(ingredient => ({ ...ingredient, dish: detail.name })))
  const suppliers = [...new Map(ingredients.filter(item => item.supplier).map(item => [item.supplier, item])).values()]
  const receivingTrace = publicIngredientReceivingTrace({
    itemIds: ingredients.flatMap(item => item.inventoryItemId ? [item.inventoryItemId] : []),
    ingredientNames: ingredients.map(item => item.name),
    schoolId: record.schoolId,
    serviceDate: record.serviceDate,
  })
  const linkedLots = publicTraceLots.filter(lot => {
    const dishNames = new Set([record.dishName].map(value => value.toLocaleLowerCase('vi-VN')))
    const lotCode = lot.lotCode.toLocaleLowerCase('vi-VN')
    const belongsToServiceDate = lot.receivedAt.slice(0, 10) === record.serviceDate
    return belongsToServiceDate && (dishNames.has(lot.linkedDish.toLocaleLowerCase('vi-VN')) || ingredients.some(item => item.lotCode?.toLocaleLowerCase('vi-VN') === lotCode))
  })
  const readyEvent = data.events.find(event => event.status === 'READY')
  const publishedReadyPhotos = readyEvent?.confirmed ? readyEvent.photos : []
  const photos = [...new Set([data.photo, ...publishedReadyPhotos].filter(Boolean))]
  const serial = `DEMO-${record.serviceDate.replaceAll('-', '')}-${record.mealType}-${String(record.sequence).padStart(3, '0')}`
  const eventDateTime = (status: string) => {
    const event = data.events.find(item => item.status === status)
    if (!event) return null
    return {
      ...event,
      fullTime: new Date(`${record.serviceDate}T${event.time}:00+07:00`).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
      }),
    }
  }
  const processStages = [
    { status: 'DISPATCHED', code: 'Handover', label: 'Xuất bếp · Đã bàn giao' },
    { status: 'ARRIVED', code: 'Receive', label: 'Đến trường' },
    { status: 'PLATED', code: 'Plated', label: 'Ra món · Chế biến xong' },
    { status: 'READY', code: 'Ready', label: 'Sẵn sàng phục vụ · Hoàn thành' },
  ].map(stage => ({ ...stage, event: eventDateTime(stage.status) }))
  const activeCount = portionQrDemo.active(portionQrDemo.scopeForSchool({
    schoolId: record.schoolId, serviceDate: record.serviceDate, mealType: record.mealType,
  })).length

  return <>
    <section className="portion-product-summary" aria-label="Thông tin suất ăn ngày">
      <div className="portion-product-image"><img src={data.photo} alt="Ảnh suất ăn trong ngày · Dữ liệu DEMO"/><span>Ảnh suất ăn · DEMO</span></div>
      <div className="portion-product-copy"><p className="section-kicker">THÔNG TIN MÓN ĂN TRONG NGÀY</p><h2>{record.dishName}</h2><strong className={readyEvent?.confirmed ? 'ready' : ''}>{readyEvent?.confirmed ? 'Sẵn sàng phục vụ · Đã xác nhận' : readyEvent ? 'Đã báo cáo · Chờ BGH xác nhận' : 'Chưa cập nhật trạng thái'}</strong><dl><div><dt>Serial</dt><dd>{serial}</dd></div><div><dt>Ngày phục vụ</dt><dd>{dateLabel(record.serviceDate)}</dd></div><div><dt>Loại bữa</dt><dd>{record.mealType === 'LUNCH' ? 'Bữa trưa' : record.mealType === 'BREAKFAST' ? 'Bữa sáng' : 'Bữa xế'}</dd></div><div><dt>Số suất dự kiến</dt><dd>{data.servings.toLocaleString('vi-VN')} suất</dd></div></dl></div>
    </section>

    <section className="portion-public-section portion-process-section" aria-labelledby="portion-process-title">
      <div className="portion-public-title"><div><p className="section-kicker">TRUY XUẤT NGUỒN GỐC</p><h2 id="portion-process-title">Hành trình của suất ăn</h2><p>Các mốc dùng ngày phục vụ và dữ liệu đã ghi nhận; trường thiếu dữ liệu được giữ nguyên “Chưa ghi nhận”.</p></div><PackageCheck/></div>
      <div className="portion-process-list">
        <article className="portion-process-card stock"><header><span>In stock · Nhập kho nguyên liệu</span><em>Dữ liệu lô công khai</em></header>{receivingTrace.length || linkedLots.length ? <ul>{receivingTrace.length ? receivingTrace.map(item => <li key={`${item.itemId}-${item.receivedAt}`}><span><strong>{item.ingredientName}</strong><small>{item.lotCode} · HSD {new Date(`${item.expiresAt}T12:00:00`).toLocaleDateString('vi-VN')}</small></span><time>{dateTimeLabel(item.receivedAt)}</time></li>) : linkedLots.map(lot => <li key={lot.id}><span><strong>{lot.ingredient}</strong><small>{lot.lotCode} · HSD {new Date(`${lot.expiresAt}T12:00:00`).toLocaleDateString('vi-VN')}</small></span><time>{dateTimeLabel(lot.receivedAt)}</time></li>)}</ul> : <p>Chưa có thời điểm tiếp nhận lô được công khai cho bữa ăn này.</p>}</article>
        {processStages.map(stage => <article className={`portion-process-card ${stage.event?.confirmed ? 'complete' : ''}`} key={stage.status}><header><span>{stage.code} · {stage.label}</span>{stage.event && <em>{stage.event.confirmed ? 'Đã xác nhận' : 'Đã báo cáo'}</em>}</header><strong>{stage.event?.fullTime ?? 'Chưa ghi nhận'}</strong>{stage.event && <small>{stage.event.actor}</small>}</article>)}
        <article className={`portion-process-card expiry ${data.mealUseByAt ? 'complete' : ''}`}><header><span>Use by · Hạn phục vụ ghi nhận</span><em>{data.mealUseByAt ? 'DEMO' : 'Thiếu dữ liệu'}</em></header><strong>{data.mealUseByAt ? dateTimeLabel(data.mealUseByAt) : 'Chưa ghi nhận'}</strong><small>Thời điểm do đơn vị khai báo, không phải kết luận hoặc thời hạn pháp lý về ATTP.</small></article>
      </div>
    </section>

    <section className="portion-public-section" aria-labelledby="portion-menu-title">
      <div className="portion-public-title"><div><p className="section-kicker">THỰC ĐƠN & ĐỊNH LƯỢNG</p><h2 id="portion-menu-title">Chi tiết riêng của món</h2><p>QR này chỉ hiển thị định lượng và nguyên liệu liên quan trực tiếp đến “{record.dishName}”.</p></div><Scale/></div>
      <div className="portion-menu-list">{dishDetails.length > 0 ? dishDetails.map(detail => <MenuQuantity detail={detail} key={detail.name}/>) : <div className="portion-data-empty">Chưa có định lượng công khai cho món ăn này.</div>}</div>
    </section>

    <section className="portion-public-section" aria-labelledby="portion-source-title">
      <div className="portion-public-title"><div><p className="section-kicker">NHÀ CUNG CẤP & NGUỒN GỐC</p><h2 id="portion-source-title">Chuỗi cung ứng liên kết</h2><p>Chỉ hiển thị trường dữ liệu được phép công khai; hóa đơn và chứng từ riêng tư không nằm trong trang QR.</p></div><Leaf/></div>
      {suppliers.length > 0 && <div className="portion-supplier-grid">{suppliers.map(supplier => <article key={supplier.supplier}><Truck size={18}/><div><small>Nhà cung cấp</small><strong>{supplier.supplier}</strong><span>{supplier.dish}{supplier.origin ? ` · ${supplier.origin}` : ''}</span></div></article>)}</div>}
      <div className="portion-lot-list">{linkedLots.length > 0 ? linkedLots.map(lot => <article key={lot.id}>
        <div className="portion-lot-head"><span><PackageCheck size={17}/><strong>{lot.ingredient}</strong></span><em>Dữ liệu DEMO</em></div>
        <span>{lot.supplier}</span><small>{lot.lotCode} · {lot.origin}</small><small>Tiếp nhận: {dateTimeLabel(lot.receivedAt)} · {lot.receivingSummary}</small>
        <div className="portion-doc-list">{lot.documents.map(document => <span key={document.reference}><FileCheck2 size={13}/>{document.title} · {document.reference}</span>)}</div>
      </article>) : <div className="portion-data-empty">Chưa có lô nguyên liệu công khai khớp với thực đơn này.</div>}</div>
    </section>

    <section className="portion-public-section" aria-labelledby="portion-monitor-title">
      <div className="portion-public-title"><div><p className="section-kicker">GIÁM SÁT BỮA ĂN</p><h2 id="portion-monitor-title">Nhật ký từ bếp đến khi phục vụ</h2><p>“Đã xác nhận” là xác nhận bước tác nghiệp trong DEMO, không phải kết luận an toàn thực phẩm.</p></div><ShieldCheck/></div>
      <div className="portion-monitor-timeline">{data.events.map(event => <article className={event.confirmed ? 'confirmed' : ''} key={`${event.status}-${event.time}`}>
        <span className="portion-monitor-node">{event.confirmed ? <Check size={14}/> : <Clock3 size={14}/>}</span>
        <div><div><strong>{event.label}</strong><time>{event.time}</time></div><p>{event.actor}</p><em>{event.confirmed ? 'Đã xác nhận' : 'Đã báo cáo · Chờ BGH xác nhận'}</em></div>
      </article>)}</div>
      {data.publicInspection && <article className="portion-inspection-summary"><FileCheck2 size={20}/><div><small>KẾT QUẢ KIỂM TRA ĐƯỢC DUYỆT CÔNG KHAI · DEMO</small><strong>{data.publicInspection.title}</strong><p>{data.publicInspection.summary}</p><span>{data.publicInspection.authority} · {data.publicInspection.recordNumber} · {new Date(`${data.publicInspection.inspectedAt}T12:00:00`).toLocaleDateString('vi-VN')}</span></div></article>}
    </section>

    <section className="portion-public-section" aria-labelledby="portion-photo-title">
      <div className="portion-public-title"><div><p className="section-kicker">HÌNH ẢNH BỮA ĂN</p><h2 id="portion-photo-title">Hình ảnh được phép công khai</h2><p>Ảnh sự kiện READY chỉ xuất hiện sau khi BGH xác nhận; ảnh minh họa luôn có nhãn DEMO.</p></div><ImageIcon/></div>
      <div className="portion-photo-grid">{photos.map((photo, index) => <figure key={`${photo.slice(0, 40)}-${index}`}><img src={photo} alt={index === 0 ? 'Hình ảnh món ăn trong thực đơn DEMO' : `Ảnh bữa ăn đã duyệt công khai ${index}`} loading="lazy"/><figcaption>{publishedReadyPhotos.includes(photo) ? 'Ảnh READY đã xác nhận công khai · DEMO' : 'Ảnh món trong thực đơn · DEMO'}</figcaption></figure>)}</div>
    </section>

    <div className="portion-service-note"><QrCode size={19}/><p>Đây là QR riêng của món <strong>{record.dishName}</strong>. Bữa này có <strong>{activeCount.toLocaleString('vi-VN')} món đang có QR</strong>; mỗi mã chỉ truy xuất một món và có thể thu hồi độc lập.</p></div>
  </>
}

export default function PortionTracePage({ token }: { token: string }) {
  const result = portionQrDemo.findPublic(token)
  const school = result ? schools.find(item => item.id === result.record.schoolId) : undefined
  const mealQuery = useQuery({
    queryKey: ['public-portion-trace', result?.record.schoolId, result?.record.serviceDate, result?.record.mealType],
    enabled: Boolean(result?.state === 'ACTIVE' && school),
    queryFn: () => {
      if (!result || !school) throw new Error('TRACE_SCOPE_NOT_FOUND')
      return demoData.day(school, result.record.serviceDate, undefined, result.record.mealType)
    },
    staleTime: 30_000,
  })

  if (!result) return <main className="portion-public"><section className="portion-public-card portion-public-state"><span className="portion-public-icon invalid"><AlertCircle/></span><p className="section-kicker">TRUY XUẤT SUẤT ĂN</p><h1>Không tìm thấy mã QR</h1><p>Mã không tồn tại trong dữ liệu DEMO trên thiết bị này hoặc đường dẫn không đầy đủ.</p><a className="outline" href="/"><ArrowLeft size={16}/>Về trang chủ</a></section></main>
  const { record, state } = result
  if (state === 'REVOKED') return <main className="portion-public"><section className="portion-public-card portion-public-state"><span className="portion-public-icon invalid"><AlertCircle/></span><p className="section-kicker">QR ĐÃ THU HỒI</p><h1>Mã này không còn hiệu lực</h1><p>Bếp đã thu hồi nhãn QR này. Không sử dụng suất ăn dựa trên mã cũ; vui lòng liên hệ đơn vị phụ trách để nhận nhãn thay thế.</p><div className="portion-public-warning"><AlertCircle size={18}/>Trạng thái thu hồi không phải kết luận về an toàn thực phẩm.</div></section></main>

  return <main className="portion-public"><article className="portion-public-card">
    <header className="portion-public-head"><span className="portion-public-icon"><QrCode/></span><div><p className="section-kicker">MỖI QR · MỘT MÓN ĂN · DEMO</p><h1>{record.dishName}</h1><span className="portion-active"><CheckCircle2 size={14}/>QR đang hoạt động</span></div></header>
    <div className="portion-public-warning demo"><AlertCircle size={18}/>Dữ liệu minh họa trên trình duyệt, chưa phải bản ghi vận hành chính thức.</div>
    <div className="portion-public-facts">
      <div><School/><span><small>Trường nhận</small><strong>{record.schoolName}</strong></span></div>
      <div><CookingPot/><span><small>Đơn vị chuẩn bị</small><strong>{record.kitchenName}</strong></span></div>
      <div><CalendarDays/><span><small>Ngày phục vụ</small><strong>{dateLabel(record.serviceDate)}</strong></span></div>
      <div><Utensils/><span><small>Loại bữa</small><strong>{record.mealType === 'LUNCH' ? 'Bữa trưa' : record.mealType === 'BREAKFAST' ? 'Bữa sáng' : 'Bữa xế'}</strong></span></div>
      <div><Scale/><span><small>Món được truy xuất</small><strong>{record.dishName}</strong></span></div>
      <div><Clock3/><span><small>QR phát hành</small><strong>{dateTimeLabel(record.issuedAt)}</strong></span></div>
    </div>
    {mealQuery.isLoading && <div className="portion-trace-loading" role="status"><span className="skeleton"/><span className="skeleton"/><p>Đang tải hồ sơ bữa ăn công khai…</p></div>}
    {mealQuery.isError && <div className="portion-public-warning"><AlertCircle size={18}/>Chưa tải được chi tiết bữa ăn. Vui lòng thử lại sau.</div>}
    {mealQuery.data && <TraceDetails record={record} data={mealQuery.data}/>}
    <div className="portion-public-privacy"><ShieldCheck size={19}/><p>QR không hiển thị tên, lớp, mã học sinh, số điện thoại, hóa đơn hoặc chứng từ riêng tư. Hồ sơ đầy đủ về quy trình không đồng nghĩa suất ăn đã được cơ quan có thẩm quyền kết luận “an toàn”.</p></div>
    <footer><span>Token …{record.publicToken.slice(-10)}</span><a href="/"><ArrowLeft size={15}/>Trang thông tin trường</a></footer>
  </article></main>
}
