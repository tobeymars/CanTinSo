import { useEffect, useRef } from 'react'
import { CalendarDays, ClipboardCheck, FileCheck2, FileSearch, Info, MapPin, Package, Phone, ShieldCheck, Truck, X } from 'lucide-react'
import type { DishIngredientRecord } from './lib/boardingMenu'
import { inventoryItems } from './lib/inventory'
import type { InventoryItem } from './lib/inventory'
import { readSuppliers } from './lib/suppliers'
import { publicTraceLots } from './lib/data'
import './IngredientTraceDialog.css'

const demoLicense = {
  title: 'Giấy chứng nhận cơ sở đủ điều kiện ATTP',
  documentNumber: 'DEMO/ATTP-NCC/2026-018',
  issuer: 'Cơ quan có thẩm quyền (minh họa)',
  issuedAt: '2026-01-15',
  expiresAt: '2027-01-15',
  applicability: 'Cung ứng lương thực, thực phẩm cho bếp trường học (DEMO)',
  updatedAt: '2026-10-12',
} as const

const formatDate = (value?: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')
  : 'Chưa ghi nhận'

export default function IngredientTraceDialog({ record, stockItem, onClose }: { record?: DishIngredientRecord; stockItem?: InventoryItem; onClose: () => void }) {
  const node = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = node.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  // Exact SKU is the only authoritative join within this DEMO; never infer a supplier from a similar name.
  const candidate = stockItem ?? inventoryItems.find(item => !!record?.inventoryItemId && item.id === record.inventoryItemId && item.lotCode === record.lotCode)
  const match = !!candidate && (!record || (record.inventoryItemId === candidate.id && record.lotCode === candidate.lotCode))
  const item = match ? candidate : undefined
  const supplier = readSuppliers().find(source => !!item?.supplierId && source.id === item.supplierId)
  const lot = publicTraceLots.find(source => !!(record?.lotCode ?? item?.lotCode) && source.lotCode === (record?.lotCode ?? item?.lotCode))
  const name = record?.name ?? item?.ingredientName ?? 'Nguyên liệu'
  const supplierName = supplier?.name || record?.supplier || lot?.supplier || 'Chưa cập nhật'
  const origin = item?.origin || record?.origin || lot?.origin || 'Chưa cập nhật'
  const lotCode = item?.lotCode || record?.lotCode || lot?.lotCode || 'Chưa có mã lô'
  const supplierLegal = supplier?.legal
  // Hồ sơ dự phòng luôn mang nhãn DEMO; không suy ra trạng thái pháp lý từ ngày hết hiệu lực.
  const license = {
    title: demoLicense.title,
    documentNumber: supplierLegal?.documentNumber || demoLicense.documentNumber,
    issuer: supplierLegal?.issuer || demoLicense.issuer,
    issuedAt: supplierLegal?.issuedAt || demoLicense.issuedAt,
    expiresAt: supplierLegal?.expiresAt || demoLicense.expiresAt,
    applicability: supplierLegal?.applicability || demoLicense.applicability,
    updatedAt: supplierLegal?.updatedAt || demoLicense.updatedAt,
  }
  return <dialog ref={node} className="ingredient-trace-dialog" aria-label={`Truy xuất nguyên liệu ${name}`} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="ingredient-trace-head"><div><span className="section-kicker">HỒ SƠ NGUYÊN LIỆU · DEMO</span><h2>{name}</h2><p>Thông tin nhà cung cấp & truy xuất lô đã khai báo</p></div><button type="button" aria-label="Đóng" className="icon-button" onClick={onClose}><X/></button></div>
    <div className="ingredient-trace-journey"><span><Truck size={20}/> Nhà cung cấp</span><span>→</span><span><Package size={20}/> Lô kho</span><span>→</span><span><ClipboardCheck size={20}/> Món ăn</span></div>
    <section className="ingredient-trace-content"><h3><Truck size={18}/> Nhà cung cấp</h3><dl><div><dt>Tên đơn vị</dt><dd>{supplierName}</dd></div><div><dt>Mã nhà cung cấp</dt><dd>{supplier?.code??'Chưa liên kết'}</dd></div><div><dt>Địa chỉ</dt><dd><MapPin size={14}/>{supplier?.address??'Chưa công khai'}</dd></div><div><dt>Điện thoại</dt><dd><Phone size={14}/>{supplier?.phone??'Chưa công khai'}</dd></div></dl></section>
    <section className="ingredient-trace-content ingredient-license-section" aria-label="Hồ sơ giấy phép nhà cung cấp DEMO">
      <div className="ingredient-license-heading"><h3><ShieldCheck size={18}/> Hồ sơ giấy phép nhà cung cấp</h3><span>DEMO</span></div>
      <article className="ingredient-license-card">
        <div className="ingredient-license-title"><span className="ingredient-license-icon"><FileCheck2 size={21}/></span><div><small>HỒ SƠ KHAI BÁO · DEMO</small><h4>{license.title}</h4></div><span className="ingredient-license-status"><Info size={13}/> Chưa xác minh</span></div>
        <dl className="ingredient-license-facts">
          <div><dt>Số hồ sơ</dt><dd>{license.documentNumber}</dd></div>
          <div><dt>Đơn vị cấp / xác nhận</dt><dd>{license.issuer}</dd></div>
          <div><dt>Ngày cấp khai báo</dt><dd><CalendarDays size={14}/>{formatDate(license.issuedAt)}</dd></div>
          <div><dt>Ngày hết hiệu lực khai báo</dt><dd><CalendarDays size={14}/>{formatDate(license.expiresAt)}</dd></div>
          <div className="wide"><dt>Phạm vi áp dụng khai báo</dt><dd>{license.applicability}</dd></div>
        </dl>
        <p className="ingredient-license-update">Cập nhật DEMO gần nhất: {formatDate(license.updatedAt)}</p>
      </article>
      <div className="ingredient-license-note"><Info size={16}/><span><strong>Dữ liệu minh họa, chưa đối chiếu bản gốc.</strong> Thông tin này không phải kết luận nhà cung cấp đủ điều kiện hoặc nguyên liệu an toàn.</span></div>
    </section>
    <section className="ingredient-trace-content"><h3><FileSearch size={18}/> Nguồn gốc & lô kho</h3><dl><div><dt>Mã lô</dt><dd>{lotCode}</dd></div><div><dt>Mã hàng trong kho</dt><dd>{item?.id??'Chưa liên kết kho'}</dd></div><div><dt>Xuất xứ khai báo</dt><dd>{origin}</dd></div><div><dt>Kho tiếp nhận</dt><dd>{item?.kitchenName??'Chưa cập nhật'}</dd></div><div><dt>Hạn sử dụng</dt><dd><CalendarDays size={14}/>{item?.expiresAt ? new Date(`${item.expiresAt}T12:00:00`).toLocaleDateString('vi-VN') : lot?.expiresAt ? new Date(`${lot.expiresAt}T12:00:00`).toLocaleDateString('vi-VN') : 'Chưa ghi nhận'}</dd></div><div><dt>Định lượng / suất</dt><dd>{record?.amountPerServing != null ? `${record.amountPerServing.toLocaleString('vi-VN')} ${record.unit}` : 'Chưa ghi nhận'}</dd></div></dl>
      <div className="ingredient-trace-status"><Info size={16}/>{match ? 'Đã liên kết mã hàng và mã lô kho DEMO, chưa xác minh chứng từ.' : 'Thông tin nguồn gốc chỉ là khai báo hoặc dữ liệu DEMO; chưa có liên kết mã kho chính xác.'}</div>
      {lot?.documents.length ? <div className="ingredient-trace-docs"><h4>Danh mục chứng từ được phép hiển thị</h4>{lot.documents.map(d=><p key={d.reference}><FileSearch size={15}/>{d.title} · {d.reference} (DEMO)</p>)}</div> : <p className="ingredient-trace-docs-empty">Chưa liên kết chứng từ công khai cho lô này.</p>}
    </section>
    <footer><span>Chỉ hiển thị khai báo DEMO. Mã lô không đồng nghĩa đã xác minh an toàn thực phẩm.</span><button type="button" className="primary" onClick={onClose}>Đóng</button></footer>
  </dialog>
}
