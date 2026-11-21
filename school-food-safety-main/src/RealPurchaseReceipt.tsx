import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createSupplyPurchase } from './lib/supplyApi'
import type { SupplyIngredient,SupplySupplier } from './lib/supplyApi'
import { convertReceiptQuantity, receiptUnitOptions, formatReceiptQuantity, preferredReceiptUnit } from './lib/supervisionUnits'

type Line={key:number;ingredientId:string;lotCode:string;quantity:string;unit:string;unitPrice:string;expiryDate:string;storageLocation:string}
const blank=(key:number):Line=>({key,ingredientId:'',lotCode:'',quantity:'',unit:'',unitPrice:'',expiryDate:'',storageLocation:''})
const cash=(n:number)=>n.toLocaleString('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
export default function RealPurchaseReceipt({kitchenId,ingredients,suppliers,canEdit,busy,execute,onSaved}:{
  kitchenId:string;ingredients:SupplyIngredient[];suppliers:SupplySupplier[];canEdit:boolean;busy:boolean;
  execute:(action:()=>Promise<unknown>,success:string)=>Promise<void>;onSaved:()=>void;
}){
  const [number,setNumber]=useState('')
  const [supplierId,setSupplierId]=useState('')
  const [invoiceNumber,setInvoiceNumber]=useState('')
  const [reference,setReference]=useState('')
  const [description,setDescription]=useState('')
  const [lines,setLines]=useState<Line[]>([blank(1)])
  const [nextId,setNextId]=useState(2)
  const sum=lines.reduce((total,line)=>total+Math.round((Number(line.quantity)||0)*(Number(line.unitPrice)||0)),0)
  function change(key:number,patch:Partial<Line>){setLines(rows=>rows.map(line=>line.key===key?{...line,...patch}:line))}
  function submit(event:FormEvent){
    event.preventDefault()
    void execute(async()=>{
      for(const line of lines){
        if(Number(line.unitPrice)<=0||Math.abs(Number(line.unitPrice)*1000000-Math.round(Number(line.unitPrice)*1000000))>0.0000001)throw new Error('Đơn giá phải lớn hơn 0 và có tối đa 6 chữ số thập phân.')
        const base=ingredients.find(item=>item.id===line.ingredientId)?.unit
        const normalized=base?convertReceiptQuantity(Number(line.quantity),line.unit||base,base):null
        if(normalized===null||normalized<=0||Math.abs(normalized*1000-Math.round(normalized*1000))>0.0000001)throw new Error('Số lượng sau quy đổi phải có tối đa 3 chữ số thập phân theo đơn vị kho.')
      }
      await createSupplyPurchase(kitchenId,{number,supplierId,invoiceNumber,reference,description,
        lines:lines.map(line=>({ingredientId:line.ingredientId,lotCode:line.lotCode,quantity:Number(line.quantity),unit:line.unit,
          unitPrice:Number(line.unitPrice),expiryDate:line.expiryDate,storageLocation:line.storageLocation}))})
      setNumber('');setSupplierId('');setInvoiceNumber('');setReference('');setDescription('');setLines([blank(1)]);setNextId(2);onSaved()
    },'Đã lưu phiếu nhập nhiều dòng và ghi nhận công nợ theo đơn giá thực tế.')
  }
  if(!canEdit)return <p className="muted">Bạn chỉ có quyền xem phiếu nhập, không được tạo chứng từ.</p>
  return <form onSubmit={submit} style={{display:'grid',gap:16}}>
    <h3>Phiếu nhập nguyên liệu · nhiều dòng hàng</h3>
    <p className="muted">Có thể chọn kg/g hoặc lít/ml. Đơn giá tính trên đúng đơn vị đã chọn; hệ thống quy đổi tồn kho riêng. Khi đổi đơn vị, cả số lượng và đơn giá được quy đổi để giữ nguyên thành tiền (tối đa 6 chữ số thập phân cho đơn giá).</p>
    <div className="management-form-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
      <label>Số phiếu nhập *<input required maxLength={60} value={number} onChange={e=>setNumber(e.target.value)} placeholder="NK-2026-0001"/></label>
      <label>Nhà cung cấp *<select required value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Chọn nhà cung cấp</option>{suppliers.filter(item=>item.status==='ACTIVE').map(item=><option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label>Số hóa đơn<input value={invoiceNumber} maxLength={100} onChange={e=>setInvoiceNumber(e.target.value)}/></label>
      <label>Tham chiếu / phiếu giao<input value={reference} maxLength={100} onChange={e=>setReference(e.target.value)}/></label>
      <label>Diễn giải<input value={description} maxLength={500} onChange={e=>setDescription(e.target.value)}/></label>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
      <h3>Chi tiết nguyên liệu ({lines.length} dòng)</h3>
      <button type="button" className="outline" disabled={lines.length>=50} onClick={()=>{setLines(items=>[...items,blank(nextId)]);setNextId(nextId+1)}}><Plus size={15}/>Thêm dòng</button>
    </div>
    <div className="table-scroll"><table className="management-table"><thead><tr><th>Nguyên liệu</th><th>Mã lô</th><th>Số lượng</th><th>Đơn vị nhập</th><th>Quy đổi về kho</th><th>Đơn giá / đơn vị nhập (VND)</th><th>Thành tiền</th><th>Hạn dùng</th><th>Vị trí</th><th></th></tr></thead><tbody>
      {lines.map((line,index)=><tr key={line.key}>
        <td><select aria-label={'Nguyên liệu dòng '+(index+1)} required value={line.ingredientId} onChange={e=>change(line.key,{ingredientId:e.target.value,unit:preferredReceiptUnit(ingredients.find(item=>item.id===e.target.value)?.unit??''),quantity:''})}><option value="">Chọn nguyên liệu</option>{ingredients.map(item=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></td>
        <td><input aria-label={'Mã lô dòng '+(index+1)} required maxLength={100} value={line.lotCode} onChange={e=>change(line.key,{lotCode:e.target.value})}/></td>
        <td><input aria-label={'Số lượng dòng '+(index+1)} type="number" required min="0.000001" step="any" value={line.quantity} onChange={e=>change(line.key,{quantity:e.target.value})}/></td>
        <td><select required aria-label={'Đơn vị nhập dòng '+(index+1)} value={line.unit} onChange={e=>{
          const base=ingredients.find(item=>item.id===line.ingredientId)?.unit??''
          const converted=convertReceiptQuantity(Number(line.quantity),line.unit||base,e.target.value)
          const factor=convertReceiptQuantity(1,line.unit||base,e.target.value)
          if(converted===null||factor===null||factor<=0)return
          const changedPrice=line.unitPrice?Number(line.unitPrice)/factor:null
          const rounded=changedPrice===null?null:Number(changedPrice.toFixed(6))
          if(rounded!==null&&rounded<=0){window.alert('Đơn giá sau quy đổi quá nhỏ để lưu chính xác. Giữ đơn vị hiện tại.');return}
          if(line.quantity&&rounded!==null&&Math.round(converted*rounded)!==Math.round(Number(line.quantity)*Number(line.unitPrice))){
            window.alert('Đổi đơn vị có thể làm thay đổi thành tiền do làm tròn đơn giá. Giữ đơn vị hiện tại để bảo toàn chứng từ.');return
          }
          change(line.key,{
            unit:e.target.value,
            quantity:line.quantity?String(converted):line.quantity,
            unitPrice:rounded!==null?String(rounded):line.unitPrice,
          })
        }}><option value="" disabled>Chọn đơn vị</option>{receiptUnitOptions(ingredients.find(item=>item.id===line.ingredientId)?.unit??'').map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></td>
        <td>{(()=>{
          const base=ingredients.find(item=>item.id===line.ingredientId)?.unit
          if(!base||!line.quantity)return '—'
          const normalized=convertReceiptQuantity(Number(line.quantity),line.unit||base,base)
          return normalized===null?'Không quy đổi được':formatReceiptQuantity(normalized)+' '+base
        })()}</td>
        <td><input aria-label={'Đơn giá dòng '+(index+1)} type="number" required min="0.000001" step="any" value={line.unitPrice} onChange={e=>change(line.key,{unitPrice:e.target.value})}/></td>
        <td><strong>{cash(Math.round((Number(line.quantity)||0)*(Number(line.unitPrice)||0)))}</strong></td>
        <td><input aria-label={'Hạn dùng dòng '+(index+1)} type="date" value={line.expiryDate} onChange={e=>change(line.key,{expiryDate:e.target.value})}/></td>
        <td><input aria-label={'Vị trí dòng '+(index+1)} maxLength={120} value={line.storageLocation} onChange={e=>change(line.key,{storageLocation:e.target.value})}/></td>
        <td><button type="button" className="outline" aria-label={'Xóa dòng '+(index+1)} disabled={lines.length===1} onClick={()=>setLines(items=>items.filter(item=>item.key!==line.key))}><Trash2 size={15}/></button></td>
      </tr>)}
    </tbody></table></div>
    <div style={{display:'flex',gap:12,justifyContent:'flex-end',alignItems:'center',flexWrap:'wrap'}}>
      <strong>Tổng tiền hàng: {cash(sum)}</strong>
      <button type="submit" className="primary" disabled={busy||!ingredients.length||!suppliers.some(item=>item.status==='ACTIVE')}>Xác nhận phiếu nhập</button>
    </div>
  </form>
}
