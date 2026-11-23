import { CalendarClock, LockKeyhole } from 'lucide-react'

export const todayInVietnam = () => new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date())
export const supervisionDateKind = (date:string):'past'|'today'|'future' =>
  date < todayInVietnam() ? 'past' : date > todayInVietnam() ? 'future' : 'today'

export default function SupervisionDateNotice({date,serverMode}:{date:string;serverMode:boolean}){
  if (!serverMode) return null
  const kind=supervisionDateKind(date)
  if(kind==='today') return null
  return <p className="supervision-date-notice" role="status">
    {kind==='future'?<LockKeyhole size={17}/>:<CalendarClock size={17}/>}
    <span>{kind==='future'
      ? 'Ngày phục vụ chưa đến: chỉ xem kế hoạch và hồ sơ hiện có; không được báo cáo hoặc xác nhận trước.'
      : 'Đang xem ngày đã qua. Mọi lần bổ sung, xác nhận hoặc mở điều chỉnh phải ghi rõ lý do và được lưu vào lịch sử.'}</span>
  </p>
}
