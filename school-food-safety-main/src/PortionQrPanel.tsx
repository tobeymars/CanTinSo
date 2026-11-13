import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Check, ExternalLink, Eye, Printer, QrCode, RotateCcw, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { MealType } from '../packages/domain/portion-qr'
import type { School } from './lib/data'
import { demoData } from './lib/data'
import type { ViewRole } from './lib/store'
import { portionQrDemo, portionTraceUrl, subscribePortionQrUpdates } from './lib/portionQr'
import './PortionQr.css'

const kitchenName = 'Bếp trung tâm An Tâm'
const mealLabels:Record<Extract<MealType,'BREAKFAST'|'LUNCH'>,string>={BREAKFAST:'Bữa sáng',LUNCH:'Bữa trưa'}

export default function PortionQrPanel({role,school,date}:{role:ViewRole;school:School;date:string}) {
  const [mealType,setMealType]=useState<Extract<MealType,'BREAKFAST'|'LUNCH'>>('LUNCH')
  const [revision,setRevision]=useState(0)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [selectedToken,setSelectedToken]=useState<string|null>(null)
  const [printMode,setPrintMode]=useState(false)
  const [showReissue,setShowReissue]=useState(false)
  const meal=useQuery({queryKey:['dish-qr-meal',school.id,date,mealType],queryFn:()=>demoData.day(school,date,undefined,mealType)})
  const scope=useMemo(()=>portionQrDemo.scopeForSchool({schoolId:school.id,serviceDate:date,mealType}),[school.id,date,mealType])
  useEffect(()=>subscribePortionQrUpdates(()=>setRevision(value=>value+1)),[])
  const selectMeal=(value:Extract<MealType,'BREAKFAST'|'LUNCH'>)=>{setMealType(value);setSelectedToken(null);setNotice('');setError('');setPrintMode(false);setShowReissue(false)}

  if(school.mode!=='CENTRAL_KITCHEN') return <section className="card portion-not-applicable"><QrCode size={38}/><h2>QR món ăn không áp dụng cho bữa này</h2><p>QR từng món hiện áp dụng với mô hình nấu tại bếp trung tâm. Bữa đang chọn là nấu tại trường.</p></section>

  const actor=portionQrDemo.actorFor(role,scope)
  let records:ReturnType<typeof portionQrDemo.list>=[]
  try { records=portionQrDemo.list(actor,scope) } catch { /* Hiển thị trạng thái không có quyền bên dưới. */ }
  const active=records.filter(record=>record.state==='ACTIVE')
  const revoked=records.filter(record=>record.state==='REVOKED')
  const selected=active.find(record=>record.publicToken===(selectedToken??active[0]?.publicToken))
  const dishes=meal.data?.dishes??[]
  const servings=meal.data?.servings??0
  const activeDishNames=new Set(active.map(record=>record.dishName.toLocaleLowerCase('vi-VN')))
  const missingDishes=dishes.filter(dish=>!activeDishNames.has(dish.toLocaleLowerCase('vi-VN')))
  const coverageReady=dishes.length>0&&missingDishes.length===0&&active.length===dishes.length
  const canIssue=role==='central_kitchen'
  const canRead=canIssue||role==='school_board'||role==='culture_social_office'
  const isSchoolBoard=role==='school_board'
  const isWard=role==='culture_social_office'

  if(!canRead) return <section className="card portion-not-applicable"><AlertCircle size={38}/><h2>Không có quyền truy cập</h2><p>Danh sách QR món ăn chỉ dành cho bếp trung tâm được gán, BGH trường nhận và đơn vị quản lý đúng địa bàn.</p></section>

  const issue=()=>{
    setError('');setNotice('')
    if(!dishes.length){setError(`${mealLabels[mealType]} chưa có món để phát hành QR.`);return}
    try {
      const created=portionQrDemo.issue({actor,scope,idempotencyKey:crypto.randomUUID(),schoolName:school.name,kitchenName,dishNames:dishes})
      setSelectedToken(created[0]?.publicToken??null)
      setNotice(`Đã phát hành ${created.length.toLocaleString('vi-VN')} QR DEMO, mỗi mã gắn với đúng một món của ${mealLabels[mealType].toLocaleLowerCase('vi-VN')}.`)
    } catch(caught) {
      const code=caught instanceof Error?caught.message:''
      setError(code==='ACTIVE_BATCH_EXISTS'?'Bữa ăn đã có QR món đang hoạt động. Muốn thay đổi thực đơn QR, hãy thu hồi lô cũ và phát hành lại.':code==='FORBIDDEN'?'Tài khoản này không phải bếp trung tâm được gán.':'Không thể phát hành QR món ăn. Vui lòng kiểm tra thực đơn và thử lại.')
    }
  }

  const reissue=(reason:string)=>{
    setError('');setNotice('')
    try {
      const count=portionQrDemo.revokeActive(actor,scope,reason)
      const created=portionQrDemo.issue({actor,scope,idempotencyKey:crypto.randomUUID(),schoolName:school.name,kitchenName,dishNames:dishes})
      setSelectedToken(created[0]?.publicToken??null);setShowReissue(false)
      setNotice(`Đã thu hồi ${count.toLocaleString('vi-VN')} QR cũ và phát hành ${created.length.toLocaleString('vi-VN')} QR mới theo từng món.`)
    } catch(caught) {
      setError(caught instanceof Error&&caught.message==='REVOCATION_REASON_REQUIRED'?'Lý do thu hồi cần ít nhất 8 ký tự.':'Không thể phát hành lại QR món ăn.')
    }
  }

  return <div className="portion-qr-page" data-revision={revision}>
    <div className="portion-meal-switch" role="group" aria-label="Chọn bữa để quản lý QR">
      {(['BREAKFAST','LUNCH'] as const).map(value=><button key={value} type="button" aria-pressed={mealType===value} className={mealType===value?'selected':''} onClick={()=>selectMeal(value)}>{mealLabels[value]}</button>)}
    </div>
    <section className="portion-qr-summary" aria-label="Đối soát QR từng món ăn">
      <div className="card"><QrCode/><strong>{active.length.toLocaleString('vi-VN')}</strong><span>QR món đang hoạt động</span></div>
      <div className={`card ${missingDishes.length?'attention':''}`}><AlertCircle/><strong>{missingDishes.length.toLocaleString('vi-VN')}</strong><span>Món còn thiếu QR</span></div>
      <div className="card"><RotateCcw/><strong>{revoked.length.toLocaleString('vi-VN')}</strong><span>QR đã thu hồi</span></div>
      <div className="card"><ShieldCheck/><strong>{servings.toLocaleString('vi-VN')}</strong><span>Suất dự kiến của bữa</span></div>
    </section>

    <section className="card portion-qr-card" aria-labelledby="portion-qr-title">
      <div className="card-header"><div><div className="section-kicker">MỖI MÓN · MỘT MÃ TRUY XUẤT</div><h2 id="portion-qr-title">QR món ăn · {school.name}</h2><p className="muted">{mealLabels[mealType]} · {new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN')} · {kitchenName}</p></div><span className={`portion-required ${isSchoolBoard||isWard?'portion-synced':''}`}><Check size={16}/>{isWard?'Giám sát địa bàn · Chỉ đọc':isSchoolBoard?(active.length?'Đã đồng bộ từ bếp trung tâm':'Đang chờ bếp phát hành'):'Bắt buộc đủ QR từng món'}</span></div>
      {(isSchoolBoard||isWard)&&<div className="portion-board-sync" role="status" aria-live="polite"><ShieldCheck size={19}/><div><strong>{isWard?'Phòng VH–XH · Chế độ giám sát chỉ đọc':'Ban Giám hiệu · Chế độ đối soát chỉ đọc'}</strong><p>{active.length?`Đã nhận ${active.length.toLocaleString('vi-VN')} QR món đang hoạt động của ${mealLabels[mealType].toLocaleLowerCase('vi-VN')}.`:'Chưa có QR món được phát hành cho bữa này.'}</p></div></div>}
      <div className="portion-privacy"><ShieldCheck size={19}/><p><strong>Mỗi QR chỉ đại diện cho một món ăn.</strong> Token không chứa thông tin học sinh và chỉ mở dữ liệu công khai của món, bữa, nguồn nguyên liệu cùng nhật ký giám sát liên quan.</p></div>
      {notice&&<p className="inventory-success" role="status"><Check size={17}/>{notice}</p>}
      {error&&<p className="error portion-error" role="alert">{error}</p>}
      {meal.isLoading?<div className="portion-empty" role="status"><span><QrCode size={40}/></span><h3>Đang tải thực đơn…</h3></div>:!active.length?<div className="portion-empty"><span><QrCode size={40}/></span><h3>Chưa phát hành QR cho {dishes.length.toLocaleString('vi-VN')} món</h3><p>Mỗi món trong {mealLabels[mealType].toLocaleLowerCase('vi-VN')} cần đúng một QR đang hoạt động.</p>{canIssue?<button className="primary" onClick={issue} disabled={!dishes.length}><QrCode size={17}/>Phát hành {dishes.length.toLocaleString('vi-VN')} QR món DEMO</button>:<small>Chờ bếp trung tâm được gán phát hành QR món.</small>}</div>:<>
        <div className="portion-actions"><div><strong>{coverageReady?'Đã đủ QR cho toàn bộ món':'Thực đơn và QR chưa khớp'}</strong><p>{active.length.toLocaleString('vi-VN')} QR hoạt động / {dishes.length.toLocaleString('vi-VN')} món trong {mealLabels[mealType].toLocaleLowerCase('vi-VN')}</p></div><div>{canIssue&&<button className="outline" onClick={()=>setPrintMode(value=>!value)}><Printer size={16}/>{printMode?'Đóng bản in':'Chuẩn bị bản in'}</button>}{canIssue&&<button className="text-button danger-text" onClick={()=>setShowReissue(value=>!value)}><RotateCcw size={15}/>Thu hồi & cấp lại</button>}</div></div>
        {showReissue&&<form className="portion-reissue" onSubmit={event=>{event.preventDefault();reissue(String(new FormData(event.currentTarget).get('reason')??''))}}><label>Lý do thu hồi toàn bộ QR món<input name="reason" required minLength={8} maxLength={300} placeholder="Ví dụ: Thực đơn thay đổi, cần phát hành lại QR…"/></label><button className="outline" type="submit">Xác nhận thu hồi và cấp lại</button></form>}
        <div className="portion-registry"><div className="portion-token-list" aria-label="Danh sách QR món đang hoạt động">{active.map(record=><button className={selected?.id===record.id?'selected':''} key={record.id} onClick={()=>setSelectedToken(record.publicToken)}><span>{record.dishName}</span><small>…{record.publicToken.slice(-8)}</small><Eye size={15}/></button>)}</div>{selected&&<aside className="portion-preview"><QRCodeSVG value={portionTraceUrl(selected.publicToken)} size={156} level="M" marginSize={2}/><strong>{selected.dishName}</strong><span>{mealLabels[mealType]} · Token …{selected.publicToken.slice(-10)}</span><a href={portionTraceUrl(selected.publicToken)} target="_blank" rel="noreferrer">Mở trang truy xuất <ExternalLink size={14}/></a></aside>}</div>
      </>}
      <div className="table-note"><AlertCircle size={15}/>DEMO · Khi triển khai thật, phát hành token và kiểm tra mỗi món có đúng một QR phải do backend thực hiện trong transaction.</div>
    </section>

    {printMode&&active.length>0&&<section className="portion-print-wrap card"><div className="portion-print-toolbar"><div><h2>Bản in QR từng món</h2><p>Mỗi nhãn bên dưới tương ứng đúng một món của {mealLabels[mealType].toLocaleLowerCase('vi-VN')}.</p></div><button className="primary" onClick={()=>window.print()}><Printer size={17}/>In {active.length.toLocaleString('vi-VN')} nhãn</button></div><div className="portion-label-sheet">{active.map(record=><article className="portion-label" key={record.id}><QRCodeSVG value={portionTraceUrl(record.publicToken)} size={112} level="M" marginSize={1}/><div><b>BỮA ĂN HỌC ĐƯỜNG · DEMO</b><strong>{record.dishName}</strong><span>{school.name}</span><small>{mealLabels[mealType]} · {new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN')}</small><code>{record.publicToken.slice(-12)}</code></div></article>)}</div></section>}
  </div>
}
