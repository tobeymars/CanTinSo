import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, Clock3, CookingPot, FileCheck2, FileSearch, FileText, Info, Pencil, Scale, ShieldCheck, Truck, Utensils, UsersRound, X } from 'lucide-react'
import CountUp from './components/react-bits/CountUp'
import SpotlightCard from './components/react-bits/SpotlightCard'
import type { MealEvent, PublicInspection, PublicTraceLot } from './lib/data'
import type { BoardingDish, DishIngredientRecord, KitchenProfile } from './lib/boardingMenu'
import { dishImage } from './lib/dishImages'
import IngredientTraceDialog from './IngredientTraceDialog'
import './DishDetailDialog.css'

type Tab = 'portion' | 'trace' | 'safety'
type Props = {
  dish: BoardingDish
  kitchen?: KitchenProfile
  linkedLots?: PublicTraceLot[]
  operationEvents?: MealEvent[]
  publicInspection?: PublicInspection | null
  onClose: () => void
  onEdit?: () => void
}
const fmt = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const textOrMissing = (value?: string) => value?.trim() || 'Chưa cập nhật'
const mealNames = { BREAKFAST: 'Bữa sáng', LUNCH: 'Bữa trưa', SNACK: 'Bữa xế' } as const
const dateText = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
const formatTime = (value?: string) => {
  if (!value) return 'Chưa ghi nhận'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Chưa ghi nhận' : parsed.toLocaleString('vi-VN')
}
const declaredLabel = (reported?: 'NOT_RECORDED' | 'REPORTED') => reported === 'REPORTED'
  ? 'Đã khai báo · Chưa xác minh' : 'Chưa ghi nhận'
const ingredientsFor = (dish: BoardingDish): DishIngredientRecord[] => dish.ingredientRecords?.length
  ? dish.ingredientRecords
  : dish.ingredients.map(name => ({ name, amountPerServing: null, unit: 'g', supplier: '', lotCode: '', origin: '' }))

/** Form data is a local DEMO record. This detail view never infers ATTP verification from a reported flag. */
export default function DishDetailDialog({ dish, kitchen, linkedLots = [], operationEvents, publicInspection, onClose, onEdit }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<Tab>('portion')
  const [traceIndex, setTraceIndex] = useState(0)
  const [activeIngredient, setActiveIngredient] = useState<DishIngredientRecord | null>(null)
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => { if (node?.open) node.close() } }, [])
  const records = ingredientsFor(dish)
  const quantityCount = records.filter(item => item.amountPerServing != null).length
  const declaredSourceCount = records.filter(item => item.supplier.trim() && item.lotCode.trim()).length
  const safety = dish.safetyMonitoring
  const reportedCount = Number(safety?.threeStep === 'REPORTED') + Number(safety?.retainedSample === 'REPORTED')
  const portionLabel = dish.portionWeightGrams != null ? `${fmt(dish.portionWeightGrams)} g` : 'Chưa cập nhật'
  const tabSpecs: { key: Tab; title: string; subtitle: string; Icon: typeof Scale }[] = [
    { key: 'portion', title: 'Định lượng', subtitle: `${quantityCount}/${records.length} nguyên liệu`, Icon: Scale },
    { key: 'trace', title: 'Nguồn gốc', subtitle: `${declaredSourceCount}/${records.length} khai báo`, Icon: FileSearch },
    { key: 'safety', title: 'Giám sát ATTP', subtitle: `${reportedCount}/2 mục ghi nhận`, Icon: ShieldCheck },
  ]
  // A DEMO lot is related to a dish, but cannot be assumed to match its ingredient record.
  const openLotFor = (record: DishIngredientRecord) => linkedLots.find(lot => !!record.lotCode && lot.lotCode === record.lotCode)
  const relatedLots = linkedLots.filter(lot => !records.some(record => record.lotCode && record.lotCode === lot.lotCode))
  const traceOptions = [
    ...records.map(record => ({ label: record.name, record, lot: openLotFor(record), unlinked: false })),
    ...relatedLots.map(lot => ({ label: lot.ingredient, record: undefined, lot, unlinked: true })),
  ]
  const selectedTrace = traceOptions[traceIndex] ?? traceOptions[0]
  const selectedLot = selectedTrace?.lot
  const selectedRecord = selectedTrace?.record
  const sourceSupplier = selectedRecord?.supplier || selectedLot?.supplier
  const sourceLotCode = selectedRecord?.lotCode || selectedLot?.lotCode
  const sourceOrigin = selectedRecord?.origin || selectedLot?.origin
  const sourceHasRecord = !!selectedRecord?.supplier.trim() && !!selectedRecord?.lotCode.trim()
  const showDate = (date?: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN') : 'Chưa cập nhật'

  return <dialog ref={dialog} className="boarding-dialog wide dish-info-dialog" aria-label={`Hồ sơ món ăn ${dish.name}`}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dish-info-wrap">
      <header className="dish-info-head">
        <div><span className="section-kicker">HỒ SƠ MÓN ĂN <span className="dish-info-demo">DEMO</span></span><h2>{dish.name}</h2><p><CalendarDays size={15} aria-hidden="true" />{dateText(dish.serviceDate)} · {mealNames[dish.mealType]}</p></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng chi tiết món ăn"><X size={20} /></button>
      </header>
      <div className="dish-info-scroll">
        <div className="dish-info-hero">
          <div className="dish-info-cover"><img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt={`Ảnh minh họa ${dish.name}`} /><span>ẢNH MINH HỌA</span></div>
          <div className="dish-info-overview"><span className="dish-info-tag"><CookingPot size={14}/>{dish.serviceMode === 'CENTRAL_KITCHEN' ? 'Bếp trung tâm' : 'Bếp tại trường'}</span>
            <p>{dish.description || 'Chưa có mô tả món ăn.'}</p>
            <dl><div><dt>Đơn vị chuẩn bị</dt><dd>{textOrMissing(kitchen?.name)}</dd></div><div><dt>Thực đơn</dt><dd>{dish.status === 'DRAFT' ? 'Bản nháp' : 'Đã khai báo'}</dd></div></dl>
          </div>
        </div>
        <div className="dish-info-keyfacts" aria-label="Tóm tắt thông tin món">
          <div><span><Scale size={16}/> Định lượng / suất</span><strong>{portionLabel}</strong></div>
          <div><span><UsersRound size={16}/> Suất dự kiến</span><strong><CountUp to={dish.expectedQuantity} separator="." duration={0.45} trigger="load"/></strong></div>
          <div><span><FileSearch size={16}/> Lô đã khai báo</span><strong>{declaredSourceCount}/{records.length}</strong></div>
        </div>
        <div className="dish-info-warning"><Info size={17}/><p><strong>Dữ liệu DEMO, chưa xác minh:</strong> định lượng theo kế hoạch, nhà cung cấp/mã lô và nhật ký giám sát chỉ là khai báo. Không có hồ sơ hoặc biên bản xác nhận thì không thể kết luận món ăn đạt an toàn thực phẩm.</p></div>
        <nav className="dish-info-tabs" aria-label="Nội dung chi tiết món ăn">
          {tabSpecs.map(({ key, title, subtitle, Icon }) => <button type="button" key={key} className={`dish-info-tab ${tab === key ? 'active' : ''}`} aria-pressed={tab === key} onClick={() => setTab(key)}><Icon size={17}/><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight size={15} className="dish-tab-chevron" /></button>)}
        </nav>
        {tab === 'portion' && <section className="dish-info-section" aria-labelledby="dish-portion-title">
          <div className="dish-info-section-head"><span className="dish-info-section-icon"><Scale size={19}/></span><div><h3 id="dish-portion-title">Bảng định lượng theo khẩu phần</h3><p>Khối lượng nguyên liệu dự kiến cho 1 học sinh và nhu cầu của toàn bộ suất ăn</p></div></div>
          <div className="dish-info-metrics"><div><span>Khối lượng món / suất</span><strong>{portionLabel}</strong></div><div><span>Nguyên liệu có định lượng</span><strong>{quantityCount}/{records.length}</strong></div></div>
          {records.length ? <div className="dish-info-table-scroll"><table className="dish-info-table"><thead><tr><th>Nguyên liệu</th><th>1 suất</th><th>{fmt(dish.expectedQuantity)} suất (dự kiến)</th></tr></thead><tbody>{records.map((item, index) => <tr key={`${item.name}-${index}`}><td><button type="button" className="dish-ingredient-link" onClick={() => setActiveIngredient(item)} title={`Xem nhà cung cấp và truy xuất nguồn gốc ${item.name}`}><FileSearch size={15}/>{item.name}<ChevronRight size={13}/></button></td><td>{item.amountPerServing != null ? `${fmt(item.amountPerServing)} ${item.unit}` : 'Chưa cập nhật'}</td><td>{item.amountPerServing != null ? `${fmt(item.amountPerServing * dish.expectedQuantity / 1000)} ${item.unit === 'g' ? 'kg' : 'lít'}` : '—'}</td></tr>)}</tbody></table></div> : <p className="dish-info-empty">Chưa có bảng nguyên liệu và định lượng.</p>}
          <p className="dish-info-hint"><Info size={14}/> Các số liệu là ước tính theo kế hoạch. Khối lượng món chín không nhất thiết bằng tổng khối lượng nguyên liệu đầu vào; chưa có định mức thì không tính tổng giả định.</p>
        </section>}
        {tab === 'trace' && <section className="dish-info-section dish-info-ref-panel dish-info-trace-panel" aria-labelledby="dish-trace-title">
          <header className="dish-info-ref-heading"><div><span className="section-kicker">TỪ NHÀ CUNG CẤP ĐẾN BỮA ĂN</span><h3 id="dish-trace-title">Hồ sơ truy xuất nguyên liệu</h3><p>Giao diện hồ sơ lô như trang Truy xuất nguồn gốc · Mỗi nguyên liệu được xem riêng.</p></div><FileSearch size={24} aria-hidden="true" /></header>
          <div className="dish-info-source-totals"><FileSearch size={17} /><strong>{declaredSourceCount}/{records.length}</strong><span>nguyên liệu có khai báo nhà cung cấp và mã lô · Chưa kiểm chứng hồ sơ</span></div>
          {traceOptions.length ? <>
            <div className="dish-info-trace-picker" role="group" aria-label="Chọn nguyên liệu để xem hồ sơ lô">
              {traceOptions.map((item, index) => <button key={`${item.label}-${index}`} type="button" className={`dish-info-trace-choice ${index === traceIndex ? 'active' : ''}`} aria-pressed={index === traceIndex} onClick={() => setTraceIndex(index)}><span className="dish-info-trace-choice-icon"><Truck size={17}/></span><span><strong>{item.label}</strong><small>{item.lot ? item.lot.lotCode : item.record?.lotCode || 'Chưa có mã lô'}</small></span><ChevronRight size={15}/></button>)}
            </div>
            <article className="dish-info-lot-profile">
              <div className="dish-info-lot-journey" aria-label="Quy trình truy xuất minh họa"><span><Truck size={23}/>Nhà cung cấp</span><ArrowRight size={17}/><span><CookingPot size={23}/>Bếp chế biến</span><ArrowRight size={17}/><span><Utensils size={23}/>Bữa ăn</span></div>
              <div className="dish-info-lot-heading"><div><span className="section-kicker">{selectedLot ? 'LÔ NGUYÊN LIỆU MINH HỌA' : 'HỒ SƠ NGUYÊN LIỆU'}</span><h4>{selectedTrace?.label}</h4><p>{textOrMissing(sourceSupplier)}</p></div><span className="dish-info-lot-badge">{selectedLot ? 'DEMO' : 'CHƯA XÁC MINH'}</span></div>
              {selectedTrace?.unlinked && <div className="dish-info-lot-caution"><AlertCircle size={17}/>Lô DEMO này được liên kết theo tên món nhưng chưa được đối chiếu với mã lô của nguyên liệu trong bảng định lượng.</div>}
              <dl className="dish-info-lot-facts">
                <div><dt>Mã lô</dt><dd>{textOrMissing(sourceLotCode)}</dd></div>
                <div><dt>Món liên kết</dt><dd>{dish.name}</dd></div>
                <div><dt>Nguồn gốc khai báo</dt><dd>{textOrMissing(sourceOrigin)}</dd></div>
                <div><dt>Ngày sản xuất / thu hoạch</dt><dd>{showDate(selectedLot?.producedAt)}</dd></div>
                <div><dt>Hạn sử dụng tham khảo</dt><dd>{showDate(selectedLot?.expiresAt)}</dd></div>
                <div><dt>Tiếp nhận tại bếp</dt><dd>{formatTime(selectedLot?.receivedAt)}</dd></div>
              </dl>
              <div className="dish-info-lot-receiving"><ClipboardCheck size={20}/><div><strong>Ghi nhận kiểm tra đầu vào {selectedLot ? 'DEMO' : ''}</strong><p>{selectedLot?.receivingSummary || (sourceHasRecord ? 'Đã khai báo thông tin nguồn gốc. Chưa có phiếu kiểm tra đầu vào đối chiếu.' : 'Chưa có biên bản kiểm tra đầu vào được liên kết cho nguyên liệu này.')}</p></div></div>
              <section className="dish-info-lot-documents" aria-label="Danh mục chứng từ liên kết"><header><div><span className="section-kicker">DANH MỤC CHỨNG TỪ</span><h5>Thông tin được phép hiển thị</h5></div><small>{selectedLot?.documents.length ?? 0} mục</small></header>
                {selectedLot?.documents.length ? selectedLot.documents.map(doc => <article key={doc.reference}><span className="dish-info-doc-icon"><FileText size={19}/></span><div><strong>{doc.title}</strong><p>{doc.reference} · Ghi nhận {showDate(doc.recordedAt)}</p></div><span className="dish-info-doc-status"><CheckCircle2 size={14}/>Đã ghi nhận DEMO</span></article>) : <div className="dish-info-document-empty"><FileText size={20}/><span>Chưa liên kết chứng từ truy xuất cho nguyên liệu này.</span></div>}
              </section>
              <p className="dish-info-lot-disclaimer"><Info size={17}/>DEMO · Dữ liệu minh họa hoặc khai báo chưa được xác minh. Chỉ có mã lô không đồng nghĩa truy xuất thành công; cần đối chiếu chứng từ kho và lô nguyên liệu thực tế.</p>
            </article>
          </> : <p className="dish-info-empty">Chưa có nguyên liệu để truy xuất.</p>}
        </section>}
        {tab === 'safety' && <section className="dish-info-section dish-info-ref-panel dish-info-safety-panel" aria-labelledby="dish-safe-title">
          <header className="dish-info-ref-heading"><div><span className="section-kicker">GIÁM SÁT & AN TOÀN</span><h3 id="dish-safe-title">Giám sát bữa ăn</h3><p>Bố cục bảng giám sát: hành trình bữa ăn, kết quả công khai và hồ sơ theo dõi.</p></div><ShieldCheck size={24} aria-hidden="true" /></header>
          <div className="dish-info-safety-dashboard">
            <SpotlightCard className="dish-info-supervision-card" theme="light" spotlightColor="#2d65b7" intensity={0.09} borderGlow={0.12} proximity={26} flare={false} ambient={false}>
              <div className="dish-info-dash-title"><div><span className="section-kicker">NHẬT KÝ VẬN HÀNH</span><h4>{dish.serviceMode === 'CENTRAL_KITCHEN' ? 'Từ bếp trung tâm đến trường' : 'Bữa ăn nấu tại trường'}</h4></div><Clock3 size={21}/></div>
              <div className="dish-info-dash-facts"><div><span className="dish-info-safe-icon"><ClipboardCheck size={19}/></span><span><small>Kiểm thực ba bước</small><strong>{declaredLabel(safety?.threeStep)}</strong></span></div><div><span className="dish-info-safe-icon"><Utensils size={19}/></span><span><small>Lưu mẫu thức ăn</small><strong>{declaredLabel(safety?.retainedSample)}</strong></span></div></div>
              {operationEvents?.length ? <ol className="dish-info-dash-timeline">{operationEvents.map((event, index) => <li key={`${event.label}-${index}`}><span className={`dish-info-dash-dot ${event.confirmed ? 'confirmed' : ''}`}>{event.confirmed ? <CheckCircle2 size={17}/> : <Clock3 size={17}/>}</span><div><div className="dish-info-dash-event"><strong>{event.label}</strong><time>{event.time || 'Chưa có giờ'}</time></div><p>{event.actor}</p><small>{event.confirmed ? 'Đã ghi nhận DEMO' : 'Chưa xác nhận'}</small>{event.photos?.length ? <span className="dish-info-dash-photos">{event.photos.map((photo, photoIndex) => <img key={`${event.status}-${photoIndex}`} src={photo} alt={`Ảnh nhật ký ${event.label} ${photoIndex + 1}`} loading="lazy" />)}</span> : null}</div></li>)}</ol> : <div className="dish-info-dash-empty"><Clock3 size={23}/><strong>Chưa có nhật ký vận hành</strong><p>Chưa có các mốc xuất bếp, đến trường, ra món hoặc sẵn sàng phục vụ gắn với ngày này.</p></div>}
              <p className="dish-info-dash-bottom"><Info size={15}/>Nhật ký giao nhận không thay thế kết quả kiểm thực hay lưu mẫu.</p>
            </SpotlightCard>
            <SpotlightCard className="dish-info-supervision-card" theme="light" spotlightColor="#2d65b7" intensity={0.09} borderGlow={0.12} proximity={26} flare={false} ambient={false}>
              <div className="dish-info-dash-title"><div><span className="section-kicker">KẾT QUẢ CÓ THẨM QUYỀN</span><h4>Kiểm tra công khai</h4></div><ShieldCheck size={21}/></div>
              {publicInspection ? <div className="dish-info-inspection"><div className="dish-info-inspection-badges"><span className="dish-info-lot-badge">DEMO</span><small>Hồ sơ công khai minh họa</small></div><h5>{publicInspection.title}</h5><p>{publicInspection.summary}</p><div className="dish-info-inspection-facts"><div><CalendarDays size={16}/><span><small>Ngày kiểm tra</small><strong>{showDate(publicInspection.inspectedAt)}</strong></span></div><div><ClipboardCheck size={16}/><span><small>Nội dung cần theo dõi</small><strong>{publicInspection.findingCount} nội dung</strong></span></div></div><div className="dish-info-inspection-agency"><ShieldCheck size={18}/><span><small>Đơn vị thực hiện</small><strong>{publicInspection.authority}</strong></span></div><p className="dish-info-inspection-note">Phạm vi: {publicInspection.scope}</p><small>{publicInspection.recordNumber} · Công khai {formatTime(publicInspection.publishedAt)}</small></div> : <div className="dish-info-inspection dish-info-inspection-empty"><span className="dish-info-lot-badge">DEMO</span><span className="dish-info-inspection-status"><AlertCircle size={16}/>Chưa có kết quả kiểm tra công khai</span><h5>Chưa có dữ liệu kiểm tra có thẩm quyền cho món ăn này</h5><p>Việc nhân viên khai báo đã kiểm thực hoặc lưu mẫu không có nghĩa bữa ăn đã được cơ quan có thẩm quyền kết luận đạt an toàn thực phẩm.</p><div className="dish-info-inspection-facts"><div><CalendarDays size={16}/><span><small>Ngày kiểm tra</small><strong>Chưa có</strong></span></div><div><ClipboardCheck size={16}/><span><small>Nội dung cần theo dõi</small><strong>Chưa công khai</strong></span></div></div><div className="dish-info-inspection-agency"><ShieldCheck size={18}/><span><small>Đơn vị thực hiện</small><strong>Chưa cập nhật</strong></span></div></div>}
              <p className="dish-info-dash-bottom"><CircleHelp size={15}/>Dữ liệu DEMO không thay thế biên bản kiểm tra thực tế.</p>
            </SpotlightCard>
          </div>
          <div className="dish-info-supervision-registry">
            <div className="dish-info-registry-head"><div><span className="section-kicker">HỒ SƠ GIÁM SÁT MÓN ĂN</span><h4>Kiểm thực, lưu mẫu và người ghi nhận</h4><p>Thông tin ở cấp món ăn; hồ sơ pháp lý cấp bếp theo dõi tại trang Giám sát & an toàn.</p></div><FileCheck2 size={22}/></div>
            <div className="dish-info-registry-stats"><div><strong>2</strong><span>Hạng mục theo dõi</span></div><div><strong>{reportedCount}</strong><span>Đã khai báo nội bộ</span></div><div className={reportedCount < 2 ? 'attention' : ''}><strong>{2 - reportedCount}</strong><span>Chưa ghi nhận</span></div></div>
            <div className="dish-info-record-grid"><article><div className="dish-info-record-top"><span className="dish-info-doc-icon"><ClipboardCheck size={20}/></span><span className={`dish-info-record-status ${safety?.threeStep === 'REPORTED' ? 'reported' : ''}`}>{declaredLabel(safety?.threeStep)}</span></div><strong>Sổ kiểm thực ba bước</strong><p>{safety?.threeStep === 'REPORTED' ? 'Đã khai báo nội bộ. Chưa có chi tiết từng bước hoặc kết quả đối chiếu.' : 'Chưa ghi nhận kết quả kiểm thực đầu vào, chế biến và trước khi phục vụ.'}</p><div><span>Nhật ký món ăn</span><ChevronRight size={16}/></div></article>
            <article><div className="dish-info-record-top"><span className="dish-info-doc-icon"><Utensils size={20}/></span><span className={`dish-info-record-status ${safety?.retainedSample === 'REPORTED' ? 'reported' : ''}`}>{declaredLabel(safety?.retainedSample)}</span></div><strong>Sổ lưu mẫu thức ăn</strong><p>{safety?.retainedSample === 'REPORTED' ? 'Đã khai báo nội bộ. Chưa có dữ liệu mẫu, nhiệt độ và thời hạn lưu để đối chiếu.' : 'Chưa ghi nhận thông tin lưu mẫu, nhiệt độ và thời hạn lưu mẫu.'}</p><div><span>Nhật ký món ăn</span><ChevronRight size={16}/></div></article></div>
            <div className="dish-info-dash-audit"><h5>Người và thời gian ghi nhận</h5><dl><div><dt>Người ghi nhận / giám sát</dt><dd>{textOrMissing(safety?.supervisor)}</dd></div><div><dt>Thời điểm</dt><dd>{formatTime(safety?.recordedAt)}</dd></div><div><dt>Ghi chú</dt><dd>{textOrMissing(safety?.note)}</dd></div></dl></div>
            <p className="dish-info-dash-bottom"><ShieldCheck size={15}/>Chỉ công khai trạng thái và thông tin đã được phép hiển thị; không khẳng định món ăn đã được xác minh đạt an toàn thực phẩm.</p>
          </div>
        </section>}

      </div>
      {activeIngredient && <IngredientTraceDialog record={activeIngredient} onClose={() => setActiveIngredient(null)}/>}
      <footer className="dish-info-footer"><small>DEMO · Không thay thế chứng từ truy xuất, kiểm thực và lưu mẫu thực tế.</small><div>{onEdit && <button type="button" className="outline" onClick={onEdit}><Pencil size={16}/> Chỉnh sửa</button>}<button type="button" className="primary" onClick={onClose}>Đóng</button></div></footer>
    </div>
  </dialog>
}
