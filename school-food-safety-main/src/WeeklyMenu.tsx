import { AlertCircle, Check, ChevronLeft, ChevronRight, CircleHelp, Utensils } from 'lucide-react'
import { demo } from './lib/data'
import type { DayData } from './lib/data'
import { compactDateLabel, weekdayLabel } from './lib/dates'

export type WeeklyMenuEntry = { date: string; data: DayData }
/** Không có `scope`: bản công khai cho phụ huynh. Có `scope`: chế độ xem nội bộ của một vai trò, kèm nhãn và ghi chú phạm vi quyền. */
export type WeeklyMenuScope = { kicker: string; note: string }
type Props = {dates:string[];entries:WeeklyMenuEntry[];selectedDate:string;isLoading:boolean;isError:boolean;onPrevious:()=>void;onNext:()=>void;onSelect:(date:string)=>void;scope?:WeeklyMenuScope}

export default function WeeklyMenu({dates,entries,selectedDate,isLoading,isError,onPrevious,onNext,onSelect,scope}:Props) {
  const byDate=new Map(entries.map(entry=>[entry.date,entry.data]))
  const source=demo?'Dữ liệu minh họa':scope?'Theo dữ liệu nhà trường':'Thông tin đã công khai'
  const note=demo
    ? `Thực đơn DEMO dùng để minh họa chế độ xem tuần, không phải lịch phục vụ chính thức.${scope?` ${scope.note}`:''}`
    : scope?.note ?? 'Thực đơn có thể được nhà trường cập nhật; chọn từng ngày để xem ảnh và nhật ký tương ứng.'
  return <section className="card weekly-menu" aria-labelledby="weekly-menu-title">
    <header className="weekly-menu-header"><div><div className="section-kicker">{scope?.kicker ?? 'TỔNG QUAN 7 NGÀY'}</div><h2 id="weekly-menu-title">Thực đơn cả tuần</h2><p>{compactDateLabel(dates[0]!)} – {compactDateLabel(dates.at(-1)!)} · {source}</p></div><div className="weekly-menu-navigation"><button className="icon-button" aria-label="Xem thực đơn tuần trước" onClick={onPrevious}><ChevronLeft/></button><span>Tuần này</span><button className="icon-button" aria-label="Xem thực đơn tuần sau" onClick={onNext}><ChevronRight/></button></div></header>
    {isLoading?<div className="weekly-menu-loading" role="status" aria-label="Đang tải thực đơn cả tuần">{dates.map(item=><span className="skeleton" key={item}/>)}</div>:isError?<div className="empty-state"><AlertCircle size={38}/><h3>Chưa tải được thực đơn tuần</h3><p>Vui lòng thử lại hoặc chọn một tuần khác.</p></div>:<div className="weekly-menu-grid">{dates.map((item,index)=>{const day=byDate.get(item);const selected=item===selectedDate;return <article className={`weekly-menu-day ${selected?'selected':''}`} key={item} aria-labelledby={`weekly-day-${item}`}><div className="weekly-day-heading"><span className="weekly-day-number"><small>{index===6?'CN':`T${index+2}`}</small><strong>{item.slice(8)}</strong></span><div><h3 id={`weekly-day-${item}`}>{weekdayLabel(item)}</h3><p>{compactDateLabel(item)} · Bữa trưa</p></div>{selected&&<span className="weekly-current"><Check size={12}/>Đang xem</span>}</div><ul>{day?.dishes.map(dish=><li key={dish}>{dish}</li>)}</ul><footer><span><Utensils size={14}/>{day ? `${day.servings.toLocaleString('vi-VN')} suất dự kiến` : 'Chưa có dữ liệu'}</span><button onClick={()=>onSelect(item)} aria-label={`Xem chi tiết thực đơn ${weekdayLabel(item)} ${compactDateLabel(item)}`}>{selected?'Xem lại chi tiết':'Xem chi tiết'}<ChevronRight size={15}/></button></footer></article>})}</div>}
    <div className="weekly-menu-note"><CircleHelp size={17}/><p>{note}</p></div>
  </section>
}
