import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import './CanteenGallery.css'
const views = [
 {id:8,title:'Toàn cảnh không gian căng tin',detail:'Thiết kế mở, kết nối với sân trường'},
 {id:7,title:'Khu vực bàn ăn',detail:'Sắc xanh cobalt cùng chất liệu gỗ ấm'},
 {id:5,title:'Quầy phục vụ KIDO EDU',detail:'Phối cảnh khu vực phục vụ và thực đơn'},
 {id:3,title:'Không gian ăn uống mở',detail:'Bàn ăn và khu vực kiosk'},
 {id:4,title:'Khu vực kiosk',detail:'Phối cảnh các điểm đặt món'},
 {id:2,title:'Lối vào và quầy thanh toán',detail:'Góc nhìn từ bên trong căng tin'},
 {id:6,title:'Quầy phục vụ chính diện',detail:'Bố trí quầy và bảng thực đơn'},
 {id:9,title:'Khu vực tiện ích',detail:'Phối cảnh bàn ăn và máy bán hàng'},
 {id:1,title:'Mặt bằng tổng thể',detail:'Góc nhìn bố trí không gian từ trên cao'},
]
export default function CanteenGallery(){
 const [selected,setSelected]=useState<number|null>(null)
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(selected!==null&&!dialog.current?.open)dialog.current?.showModal()},[selected])
 const move=(offset:number)=>setSelected(i=>i===null?0:(i+offset+views.length)%views.length)
 const current=selected===null?null:views[selected]!
 return <section className="canteen-gallery" aria-label="Ảnh phối cảnh căng tin"><div className="gallery-heading"><div><div className="section-kicker">KHÔNG GIAN CHO NHỮNG BỮA ĂN VUI</div><h2>Một góc trường, nhiều niềm vui.</h2><p>Khám phá không gian căng tin qua những góc nhìn thiết kế.</p></div><button className="outline" onClick={()=>setSelected(0)}><Images size={16}/>Xem {views.length} ảnh</button></div><div className="gallery-grid">{views.slice(0,3).map((view,i)=><button className={`gallery-tile tile-${i}`} key={view.id} onClick={()=>setSelected(i)} aria-label={`Xem phối cảnh: ${view.title}`}><img src={`/images/canteen/view-${view.id}.jpg`} alt={`Phối cảnh ${view.title.toLowerCase()}`} loading="lazy" width={1800} height={950}/><span className="gallery-image-label">PHỐI CẢNH MINH HỌA</span><span className="gallery-caption"><span><strong>{view.title}</strong><small>{view.detail}</small></span><ArrowUpRight size={20}/></span></button>)}</div><p className="gallery-disclaimer">Ảnh phối cảnh do bạn cung cấp · Không phải ảnh báo cáo bữa ăn hoặc bằng chứng kiểm tra.</p>{current&&<dialog className="gallery-dialog" ref={dialog} aria-label={current.title} onCancel={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}}}><div className="dialog-head"><div><h2>{current.title}</h2><p>Phối cảnh minh họa · {selected!+1} / {views.length}</p></div><button className="icon-button" aria-label="Đóng bộ sưu tập" onClick={()=>setSelected(null)}><X/></button></div><img className="gallery-full-image" src={`/images/canteen/view-${current.id}.jpg`} alt={`Phối cảnh ${current.title.toLowerCase()}`}/><div className="gallery-controls"><button className="outline" onClick={()=>move(-1)}><ChevronLeft size={17}/>Ảnh trước</button><span>{current.detail}</span><button className="outline" onClick={()=>move(1)}>Ảnh tiếp<ChevronRight size={17}/></button></div><div className="gallery-thumbnails">{views.map((v,i)=><button className={selected===i?'current':''} key={v.id} aria-label={`Mở ảnh ${i+1}: ${v.title}`} aria-pressed={selected===i} onClick={()=>setSelected(i)}><img src={`/images/canteen/view-${v.id}.jpg`} alt="" loading="lazy"/></button>)}</div></dialog>}</section>
}
