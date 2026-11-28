import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { StockEvidenceInput,StockInspection } from './lib/supplyApi'

const rules={
 RECEIPT:[
  {category:'DELIVERY_NOTE' as const,label:'Phiếu giao hàng / chứng từ nguồn gốc *',accept:'.pdf,image/jpeg,image/png,image/webp'},
  {category:'LOT_PHOTO' as const,label:'Ảnh thực tế hàng và nhãn lô *',accept:'image/jpeg,image/png,image/webp'},
 ],
 ISSUE:[
  {category:'ISSUE_PHOTO' as const,label:'Ảnh thực tế nguyên liệu xuất *',accept:'image/jpeg,image/png,image/webp'},
  {category:'SCALE_PHOTO' as const,label:'Ảnh cân / xác nhận số lượng xuất *',accept:'image/jpeg,image/png,image/webp'},
 ],
 RETURN:[
  {category:'RETURN_PHOTO' as const,label:'Ảnh nguyên liệu chưa sử dụng nhập hoàn *',accept:'image/jpeg,image/png,image/webp'},
  {category:'SCALE_PHOTO' as const,label:'Ảnh cân xác nhận lượng hoàn *',accept:'image/jpeg,image/png,image/webp'},
 ],
}
export const emptyInspection=():StockInspection=>({
 inspector:'',counterparty:'',location:'',documentNumber:'',actualTime:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}),
 temperatureC:'',documents:'PENDING',packaging:'PENDING',sensory:'PENDING',transport:'PENDING',quantity:'PENDING',weighing:'PENDING',remarks:'',
})
export function StockInspectionFields({kind,value,onChange}:{kind:'RECEIPT'|'ISSUE'|'RETURN';value:StockInspection;onChange:(value:StockInspection)=>void}){
 const set=(patch:Partial<StockInspection>)=>onChange({...value,...patch})
 const fields=kind==='RECEIPT'?[
  {key:'documents' as const,label:'Nguồn gốc và chứng từ đã đối chiếu'},
  {key:'packaging' as const,label:'Bao gói, nhãn hàng hóa đạt'},
  {key:'sensory' as const,label:'Cảm quan nguyên liệu đạt'},
  {key:'transport' as const,label:'Điều kiện vận chuyển/bảo quản đạt'},
  {key:'quantity' as const,label:'Số lượng và chủng loại thực nhận khớp'},
 ]:kind==='ISSUE'?[
  {key:'packaging' as const,label:'Lô và bao gói còn phù hợp'},
  {key:'quantity' as const,label:'Số lượng thực xuất đã kiểm đếm'},
  {key:'weighing' as const,label:'Đã cân và đối chiếu kết quả thực tế'},
 ]:[
  {key:'packaging' as const,label:'Nguyên liệu chưa sử dụng, bao gói an toàn'},
  {key:'quantity' as const,label:'Số lượng hoàn đã kiểm đếm'},
  {key:'weighing' as const,label:'Đã cân thực tế khi nhập hoàn'},
  {key:'transport' as const,label:'Điều kiện bảo quản nguyên liệu hoàn còn đạt'},
 ]
 return <fieldset className="stock-audit-fieldset">
  <legend>Biên bản {kind==='RECEIPT'?'kiểm nhận nguyên liệu':kind==='RETURN'?'kiểm nhận nguyên liệu hoàn':'kiểm xuất nguyên liệu'}</legend>
  <div className="supply-form-grid">
   <label>Người kiểm tra *<input required minLength={2} maxLength={120} value={value.inspector} onChange={e=>set({inspector:e.target.value})} placeholder="Họ tên người kiểm"/></label>
   <label>{kind==='RECEIPT'?'Người giao hàng *':kind==='RETURN'?'Người hoàn nguyên liệu *':'Người nhận nguyên liệu *'}<input required minLength={2} maxLength={120} value={value.counterparty} onChange={e=>set({counterparty:e.target.value})}/></label>
   <label>Khu vực kiểm nhận *<input required minLength={2} maxLength={160} value={value.location} onChange={e=>set({location:e.target.value})} placeholder="Khu vực giao nhận / nơi cân"/></label>
   <label>Giờ thực tế *<input required type="time" value={value.actualTime} onChange={e=>set({actualTime:e.target.value})}/></label>
   <label>Nhiệt độ đo (°C, nếu cần)<input type="number" min="-40" max="120" step="0.1" value={value.temperatureC} onChange={e=>set({temperatureC:e.target.value})}/></label>
  </div>
  <p className="muted">Chỉ xác nhận phiếu kho khi toàn bộ tiêu chí đều đạt. Hàng không đạt cần lập hồ sơ cách ly/trả hàng riêng; không nhập tồn khả dụng.</p>
  <div className="stock-audit-checks">
   {fields.map(field=><label key={field.key}><input type="checkbox" required checked={value[field.key]==='PASS'} onChange={e=>set({[field.key]:e.target.checked?'PASS':'PENDING'})}/>{field.label} *</label>)}
  </div>
  <label>Ghi chú kiểm tra / điều kiện bảo quản<textarea maxLength={1000} rows={2} value={value.remarks} onChange={e=>set({remarks:e.target.value})}/></label>
 </fieldset>
}
export function StockEvidenceFields({kind,value,onChange}:{kind:'RECEIPT'|'ISSUE'|'RETURN';value:StockEvidenceInput[];onChange:(value:StockEvidenceInput[])=>void}){
 const [error,setError]=useState('')
 async function load(event:ChangeEvent<HTMLInputElement>,category:StockEvidenceInput['category']){
  const file=event.target.files?.[0]
  if(!file)return
  if(file.size>2*1024*1024){setError('Mỗi minh chứng tối đa 2 MB.');return}
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){setError('Chỉ hỗ trợ PDF, JPG, PNG, WEBP.');return}
  try{
   const base64=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader()
    reader.onerror=()=>reject(Error('Không đọc được tệp.'))
    reader.onload=()=>resolve(String(reader.result).split(',')[1]??'')
    reader.readAsDataURL(file)
   })
   onChange([...value.filter(item=>item.category!==category),{category,filename:file.name,mimeType:file.type,base64}])
   setError('')
  }catch(e){setError(e instanceof Error?e.message:'Không thể đọc minh chứng.')}
 }
 return <fieldset className="stock-audit-fieldset"><legend>Ảnh và giấy tờ gắn với phiếu kho</legend>
  <p className="muted">Lưu vĩnh viễn cùng số phiếu và người thực hiện. Không thay thế tệp sau khi ghi sổ; PDF/ảnh tối đa 2 MB/tệp.</p>
  <div className="supply-form-grid">
   {rules[kind].map(item=><label key={item.category}>{item.label}
    <input type="file" required={!value.some(x=>x.category===item.category)} accept={item.accept} onChange={e=>void load(e,item.category)}/>
    {value.find(x=>x.category===item.category)&&<small>Đã chọn: {value.find(x=>x.category===item.category)?.filename}</small>}
   </label>)}
  </div>
  {error&&<p className="error" role="alert">{error}</p>}
 </fieldset>
}
