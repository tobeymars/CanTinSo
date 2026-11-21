import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Paperclip, Plus, Trash2 } from 'lucide-react'
import { archiveSupplierDocument,downloadSupplierDocument,getSupplierDocuments,uploadSupplierDocument } from './lib/supplyApi'

const kinds:{id:string;label:string}[]=[
 {id:'registration',label:'Đăng ký kinh doanh / quyết định thành lập'},
 {id:'food_safety',label:'Giấy chứng nhận / hồ sơ ATTP'},
 {id:'contract',label:'Hợp đồng cung ứng'},
 {id:'origin',label:'Chứng từ nguồn gốc / kiểm dịch'},
 {id:'inspection',label:'Phiếu kiểm nghiệm / kiểm tra'},
 {id:'other',label:'Giấy tờ khác'},
]
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)
const toBase64=(file:File)=>new Promise<string>((resolve,reject)=>{
 const reader=new FileReader()
 reader.onload=()=>{const value=reader.result;if(typeof value!=='string'||!value.includes(','))return reject(new Error('Không đọc được chứng từ.'));resolve(value.slice(value.indexOf(',')+1))}
 reader.onerror=()=>reject(new Error('Không đọc được chứng từ.'))
 reader.readAsDataURL(file)
})
export default function RealSupplierDocuments({kitchenId,supplierId,supplierName,canEdit,busy,execute}:{
 kitchenId:string;supplierId:string;supplierName:string;canEdit:boolean;busy:boolean;
 execute:(action:()=>Promise<unknown>,success:string)=>Promise<void>
}){
 const docs=useQuery({queryKey:['supply-documents',kitchenId,supplierId],queryFn:()=>getSupplierDocuments(kitchenId,supplierId),enabled:!!kitchenId&&!!supplierId})
 const [file,setFile]=useState<File|null>(null)
 const [category,setCategory]=useState('registration')
 const [documentNumber,setDocumentNumber]=useState('')
 const [issuer,setIssuer]=useState('')
 const [issuedAt,setIssuedAt]=useState('')
 const [expiresAt,setExpiresAt]=useState('')
 const [fileError,setFileError]=useState('')
 function submit(event:FormEvent){event.preventDefault();if(!file)return
  if(file.size>2*1024*1024){setFileError('Chứng từ vượt giới hạn 2 MB.');return}
  void execute(async()=>{
   const base64=await toBase64(file)
   await uploadSupplierDocument(kitchenId,supplierId,{category,filename:file.name,mimeType:file.type,base64,documentNumber,issuer,issuedAt,expiresAt})
   await docs.refetch()
   setFile(null);setDocumentNumber('');setIssuer('');setIssuedAt('');setExpiresAt('');setFileError('')
  },'Đã lưu chứng từ nhà cung cấp. Hồ sơ chưa mặc nhiên được xác minh.')
 }
 async function download(id:string){
  try{
   const result=await downloadSupplierDocument(kitchenId,supplierId,id)
   const bytes=Uint8Array.from(atob(result.base64),char=>char.charCodeAt(0))
   const url=URL.createObjectURL(new Blob([bytes],{type:result.mimeType}))
   const element=document.createElement('a');element.href=url;element.download=result.filename;element.click()
   setTimeout(()=>URL.revokeObjectURL(url),2000);setFileError('')
  }catch(error){setFileError(error instanceof Error?error.message:'Không thể tải chứng từ.')}
 }
 const records=docs.data??[]
 return <section className="card" style={{padding:16,display:'grid',gap:12}}>
  <header className="card-header"><div><span className="section-kicker">HỒ SƠ NHÀ CUNG CẤP</span><h3><Paperclip size={18}/>{supplierName}</h3><p className="muted">Chứng từ được lưu theo nhà cung cấp và bếp, không dùng dữ liệu DEMO. Tệp đính kèm chưa đồng nghĩa đã xác minh pháp lý.</p></div></header>
  {docs.isLoading&&<p role="status">Đang tải hồ sơ…</p>}
  {docs.isError&&<p className="error" role="alert">{docs.error.message}</p>}
  <div className="table-scroll"><table className="management-table"><thead><tr><th>Loại hồ sơ</th><th>Tên tệp</th><th>Số hồ sơ</th><th>Đơn vị cấp</th><th>Ngày hết hạn</th><th></th></tr></thead><tbody>
   {records.map(row=><tr key={row.id}>
     <td>{kinds.find(kind=>kind.id===row.category)?.label??row.category}</td>
     <td><FileText size={14}/>{row.filename}</td><td>{row.documentNumber||'—'}</td><td>{row.issuer||'—'}</td>
     <td>{row.expiresAt?<span>{new Date(row.expiresAt).toLocaleDateString('vi-VN')} {row.expiresAt.slice(0,10)<today()?'· Đã hết hiệu lực':''}</span>:'Chưa khai báo'}</td>
     <td><div style={{display:'flex',gap:6}}>
       <button type="button" className="outline" onClick={()=>void download(row.id)}><Download size={14}/>Tải</button>
       {canEdit&&<button className="outline" type="button" disabled={busy} onClick={()=>{if(window.confirm('Lưu trữ chứng từ này? Hồ sơ sẽ được ẩn khỏi danh sách nhưng không xóa vật lý.'))void execute(async()=>{await archiveSupplierDocument(kitchenId,supplierId,row.id);await docs.refetch()},'Đã chuyển chứng từ sang lưu trữ.')}}><Trash2 size={14}/>Lưu trữ</button>}
     </div></td>
   </tr>)}
  </tbody></table></div>
  {!records.length&&!docs.isLoading&&<p className="muted">Nhà cung cấp chưa có chứng từ.</p>}
  {canEdit&&<form onSubmit={submit} style={{display:'grid',gap:10}}>
    <h4>Thêm hồ sơ / chứng từ</h4>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
     <label>Loại hồ sơ<select value={category} onChange={e=>setCategory(e.target.value)}>{kinds.map(kind=><option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
     <label>Số hồ sơ<input maxLength={120} value={documentNumber} onChange={e=>setDocumentNumber(e.target.value)}/></label>
     <label>Đơn vị cấp<input maxLength={200} value={issuer} onChange={e=>setIssuer(e.target.value)}/></label>
     <label>Ngày cấp<input type="date" value={issuedAt} onChange={e=>setIssuedAt(e.target.value)}/></label>
     <label>Ngày hết hạn<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
     <label>Tệp PDF / ảnh (tối đa 2 MB) *<input required type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]??null);setFileError('')}}/></label>
    </div>
    <div><button className="primary" type="submit" disabled={busy||!file}><Plus size={15}/>Thêm chứng từ</button></div>
  </form>}
  {fileError&&<p className="error" role="alert">{fileError}</p>}
 </section>
}
