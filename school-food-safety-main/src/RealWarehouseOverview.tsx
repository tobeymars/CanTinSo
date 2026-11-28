import { Boxes, ClipboardList, Clock3, PackageCheck, ShieldAlert, Truck, Wallet } from 'lucide-react'
import type { SupplyFinance,SupplyLot,SupplyMovement,SupplyMinimum } from './lib/supplyApi'
import { convertReceiptQuantity, readableStockQuantity } from './lib/supervisionUnits'

const currency=(n:number)=>n.toLocaleString('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)
export default function RealWarehouseOverview({lots,movements,finance,minimums,onOpen}:{
 lots:SupplyLot[];movements:SupplyMovement[];finance?:SupplyFinance;minimums:SupplyMinimum[];onOpen:(tab:'stock'|'receipts'|'issues'|'lots'|'trace')=>void
}){
 const now=today(),soon=new Date(now+'T00:00:00Z');soon.setUTCDate(soon.getUTCDate()+7)
 const week=soon.toISOString().slice(0,10)
 const expired=lots.filter(lot=>lot.remainingQty>0&&lot.expiryDate&&lot.expiryDate.slice(0,10)<now)
 const expiring=lots.filter(lot=>lot.remainingQty>0&&lot.expiryDate&&lot.expiryDate.slice(0,10)>=now&&lot.expiryDate.slice(0,10)<=week)
 const available=lots.filter(lot=>lot.status==='AVAILABLE'&&lot.remainingQty>0&&!expired.includes(lot))
 const receiptEvents=movements.filter(event=>event.eventType==='RECEIVED')
 const issueEvents=movements.filter(event=>event.eventType==='ISSUED')
 const purchaseByLot=new Map<string,{quantity:number;amount:number}>()
 for(const receipt of finance?.receipts??[]){
   for(const line of receipt.lines){
     const prev=purchaseByLot.get(line.lot.id)??{quantity:0,amount:0}
     purchaseByLot.set(line.lot.id,{quantity:prev.quantity+line.quantity,amount:prev.amount+line.amount})
   }
 }
 // Tính đơn giá bình quân có trọng số khi một lô được bổ sung qua nhiều phiếu nhập.
 const priced=new Map([...purchaseByLot.entries()].filter(([,v])=>v.quantity>0).map(([id,v])=>[id,v.amount/v.quantity]))
 const valued=lots.filter(lot=>priced.has(lot.id))
 const stockValue=valued.reduce((sum,lot)=>sum+Math.round(lot.remainingQty*(priced.get(lot.id)??0)),0)
 const unpriced=lots.filter(lot=>!priced.has(lot.id))
 const stockByIngredient=new Map<string,number>()
 const incompatibleUnits=new Set<string>()
 for(const lot of lots){
   if(lot.status!=='AVAILABLE'||lot.remainingQty<=0||lot.expiryDate&&lot.expiryDate.slice(0,10)<now)continue
   const target=minimums.find(min=>min.ingredientId===lot.ingredientId)?.ingredient.unit??lot.unit
   const normalized=convertReceiptQuantity(lot.remainingQty,lot.unit,target)
   if(normalized===null){incompatibleUnits.add(lot.ingredientId);continue}
   stockByIngredient.set(lot.ingredientId,(stockByIngredient.get(lot.ingredientId)??0)+normalized)
 }
 const low=minimums.filter(row=>Number(row.minimumQty)>0&&!incompatibleUnits.has(row.ingredientId)&&(stockByIngredient.get(row.ingredientId)??0)<Number(row.minimumQty))
 const stats=[
  {Icon:Boxes,title:'Lô trong kho',value:String(lots.length),detail:'Toàn bộ lô của bếp',target:'lots' as const},
  {Icon:PackageCheck,title:'Lô có thể xuất',value:String(available.length),detail:'Chưa hết hạn và còn tồn',target:'stock' as const},
  {Icon:Wallet,title:'Giá trị tồn đã định giá',value:finance?currency(stockValue):'Giới hạn quyền xem',detail:finance?unpriced.length+' lô chưa có giá':'Chỉ tài khoản bếp xem giá trị kho',target:'stock' as const},
  {Icon:Clock3,title:'Lô hết hạn trong 7 ngày',value:String(expiring.length),detail:'Cần ưu tiên kiểm tra / FEFO',target:'lots' as const},
  {Icon:ShieldAlert,title:'Nguyên liệu dưới định mức',value:String(low.length),detail:'Theo ngưỡng của từng bếp',target:'stock' as const},
  {Icon:ShieldAlert,title:'Lô quá hạn',value:String(expired.length),detail:'Không được xuất sử dụng',target:'lots' as const},
  {Icon:Truck,title:'Phiếu nhập có giá',value:String(finance?.receipts.length??0),detail:'Phiếu nhập đã ghi nhận',target:'receipts' as const},
  {Icon:ClipboardList,title:'Nhật ký nhập / xuất',value:String(receiptEvents.length+issueEvents.length),detail:'200 sự kiện gần nhất',target:'trace' as const},
 ];
 const totals=new Map<string,{unit:string;name:string;quantity:number;available:number;unavailable:number;lotCount:number}>()
 for(const lot of lots){
   const key=lot.ingredientId+'|'+lot.unit
   const current=totals.get(key)??{name:lot.ingredient.name,unit:lot.unit,quantity:0,available:0,unavailable:0,lotCount:0}
   const quantity=Math.max(0,lot.remainingQty)
   const canIssue=lot.status==='AVAILABLE'&&quantity>0&&(!lot.expiryDate||lot.expiryDate.slice(0,10)>=now)
   current.quantity+=quantity
   if(canIssue)current.available+=quantity
   else current.unavailable+=quantity
   current.lotCount++
   totals.set(key,current)
 }
 const totalsRows=[...totals.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'))
 const quantityLabel=(value:number,unit:string)=>readableStockQuantity(value,unit)
 return <div className="supply-overview">
  <div className="warehouse-kpis supply-overview-kpis">
   {stats.map(({Icon,title,value,detail,target})=><button type="button" className="card supply-overview-kpi" key={title} onClick={()=>onOpen(target)}>
     <Icon size={20}/><span>{title}</span><strong style={{fontSize:'1.35rem'}}>{value}</strong><small>{detail}</small>
   </button>)}
  </div>
  {incompatibleUnits.size>0&&<p role="alert" className="error">Có {incompatibleUnits.size} nguyên liệu chứa lô với đơn vị không thể quy đổi. Cần đối chiếu dữ liệu kho trước khi kết luận tồn tối thiểu.</p>}
  {low.length>0&&<section className="card supply-panel supply-warning-panel">
    <strong>Nguyên liệu cần bổ sung</strong>
    {low.map(row=><p key={row.ingredientId} className="muted">{row.ingredient.name}: còn {readableStockQuantity(stockByIngredient.get(row.ingredientId)??0,row.ingredient.unit)}, định mức {readableStockQuantity(Number(row.minimumQty),row.ingredient.unit)}</p>)}
    <button type="button" className="outline" onClick={()=>onOpen('stock')}>Kiểm tra tồn kho</button>
  </section>}
  {expired.length>0&&<section className="card supply-panel supply-warning-panel"><strong>Chú ý: Có {expired.length} lô quá hạn</strong><p className="muted">Không được xuất các lô quá hạn. Kiểm tra và xử lý theo quy trình cách ly.</p><button type="button" className="outline" onClick={()=>onOpen('lots')}>Xem lô cần xử lý</button></section>}
  <section className="card supply-panel supply-ingredient-summary">
   <header className="card-header"><div><div className="section-kicker">TỒN KHO THEO NGUYÊN LIỆU</div><h3>Tổng hợp tồn kho</h3><p className="muted">Số lượng theo từng nguyên liệu, chỉ cộng các lô cùng đơn vị. Hàng cách ly, quá hạn không tính vào lượng có thể xuất.</p></div>
    <span className="supply-ingredient-summary__count">{totalsRows.length} nguyên liệu</span>
   </header>
   <div className="supply-table-scroll"><table className="management-table supply-table supply-ingredient-summary__table">
    <thead><tr><th scope="col">Nguyên liệu</th><th scope="col">Đơn vị kho</th><th scope="col">Tổng tồn thực tế</th><th scope="col">Có thể xuất</th><th scope="col">Chưa thể xuất</th></tr></thead>
    <tbody>{totalsRows.map(row=><tr key={row.name+'|'+row.unit}>
      <td><strong className="supply-ingredient-summary__name">{row.name}</strong><small>{row.lotCount} lô hàng</small></td>
      <td><span className="supply-ingredient-summary__unit">{row.unit}</span></td>
      <td className="supply-ingredient-summary__number"><strong>{quantityLabel(row.quantity,row.unit)}</strong>{row.quantity===0&&<small>Đã hết tồn</small>}</td>
      <td className="supply-ingredient-summary__number"><span className={row.available>0?'supply-ingredient-summary__available':''}>{quantityLabel(row.available,row.unit)}</span></td>
      <td className="supply-ingredient-summary__number">{row.unavailable>0?<span className="supply-ingredient-summary__blocked">{quantityLabel(row.unavailable,row.unit)}</span>:<span className="supply-ingredient-summary__zero">—</span>}</td>
    </tr>)}</tbody>
   </table></div>
   {!totalsRows.length&&<p className="muted">Chưa có nguyên liệu nào được nhập vào bếp.</p>}
   {totalsRows.length>0&&<p className="supply-ingredient-summary__note">Tổng tồn là số lượng vật lý còn trong kho. “Chưa thể xuất” bao gồm hàng đang cách ly, tạm ngưng hoặc quá hạn; xem mục Lô hàng để biết nguyên nhân cụ thể.</p>}
  </section>
 </div>
}
