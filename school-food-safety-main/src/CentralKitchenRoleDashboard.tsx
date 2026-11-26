import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getKitchenShiftTasks, updateKitchenShiftTask } from './lib/kitchenShiftApi'
import { fetchMyKitchenContext } from './lib/myKitchenApi'
import { loadMealPlanWorkspace } from './lib/mealPlanApi'
import { listKitchenLegal } from './lib/kitchenLegalApi'
import { getStoredUser } from './lib/authApi'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Check, ChefHat, ClipboardCheck, Clock3, CookingPot, PackageCheck, Route, ShieldCheck, Sparkles, SprayCan, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CentralKitchenRole } from './lib/store'
import { centralKitchenRoleLabels } from './lib/store'
import './CentralKitchenRoleDashboard.css'

type Task = { id:string; time:string; title:string; detail:string }
type RoleView = {
  icon:LucideIcon; kicker:string; title:string; description:string
  metrics:{label:string;value:string;note:string}[]
  tasks:Task[]
  primary:{label:string;path:string}; secondary:{label:string;path:string}
}

const roleViews:Record<CentralKitchenRole,RoleView>={
  manager:{icon:Users,kicker:'ĐIỀU HÀNH TOÀN BẾP',title:'Nắm nhịp vận hành trong một màn hình.',description:'Theo dõi đội ngũ, kế hoạch chế biến, số suất và tiến độ giao trường trong phạm vi Bếp trung tâm An Tâm.',metrics:[{label:'Nhân sự trong ca',value:'7',note:'Theo lịch DEMO hôm nay'},{label:'Trường nhận',value:'2',note:'Trong phạm vi phân công'},{label:'Suất dự kiến',value:'1.061',note:'Chờ đối chiếu thực xuất'},{label:'Hồ sơ cần rà soát',value:'3',note:'Sắp đến hạn trong 60 ngày'}],tasks:[{id:'manager-staff',time:'06:00',title:'Rà soát nhân sự đầu ca',detail:'Đối chiếu vị trí còn thiếu và người thay ca.'},{id:'manager-menu',time:'06:20',title:'Đối chiếu thực đơn hai trường',detail:'Kiểm tra số suất và thay đổi từ BGH.'},{id:'manager-dispatch',time:'09:15',title:'Chốt điều kiện xuất bếp',detail:'Đối chiếu suất, QR và người phụ trách chuyến.'}],primary:{label:'Cập nhật giám sát & an toàn',path:'/giam-sat'},secondary:{label:'Mở quản lý kho',path:'/quan-ly-kho'}},
  head_chef:{icon:ChefHat,kicker:'BẾP TRƯỞNG · CA SÁNG',title:'Điều phối dây chuyền chế biến.',description:'Bám sát thực đơn, nhịp sơ chế, bếp nóng và bàn giao sang khu chia suất.',metrics:[{label:'Món cần chế biến',value:'5',note:'Thực đơn trưa DEMO'},{label:'Đã sẵn sàng nấu',value:'3/5',note:'Theo checklist nội bộ'},{label:'Nhân sự trong ca',value:'7',note:'1 vị trí đang nghỉ phép'},{label:'Mốc bàn giao',value:'08:45',note:'Sang khu chia suất'}],tasks:[{id:'chef-menu',time:'05:45',title:'Kiểm tra công thức và định lượng',detail:'Đối chiếu 5 món với kế hoạch suất ăn.'},{id:'chef-prep',time:'07:10',title:'Xác nhận nguyên liệu đã sơ chế',detail:'Kiểm tra bàn giao từ khu sơ chế.'},{id:'chef-batch',time:'08:30',title:'Rà soát các mẻ nấu',detail:'Ghi chú sai lệch trước khi chia suất.'}],primary:{label:'Xem thực đơn cần chuẩn bị',path:'/thuc-don'},secondary:{label:'Xem giám sát & an toàn',path:'/giam-sat'}},
  prep:{icon:ClipboardCheck,kicker:'KHU SƠ CHẾ · CA SÁNG',title:'Chuẩn bị đúng lô, đúng định lượng.',description:'Checklist theo lô nguyên liệu và thứ tự bàn giao cho bếp nóng.',metrics:[{label:'Lô cần xử lý',value:'4',note:'Dữ liệu nguyên liệu DEMO'},{label:'Đã hoàn thành',value:'3/4',note:'Một lô đang thực hiện'},{label:'Khối lượng dự kiến',value:'42 kg',note:'Không phải số cân thực tế'},{label:'Bàn giao trước',value:'07:30',note:'Theo kế hoạch ca'}],tasks:[{id:'prep-rice',time:'05:50',title:'Đối chiếu lô gạo',detail:'Kiểm tra mã lô trước khi cấp vào khu nấu.'},{id:'prep-vegetable',time:'06:10',title:'Sơ chế rau củ',detail:'Phân loại và bàn giao theo món.'},{id:'prep-meat',time:'06:35',title:'Chuẩn bị nguyên liệu món mặn',detail:'Đối chiếu lượng giao theo phiếu DEMO.'}],primary:{label:'Xem giám sát & an toàn',path:'/giam-sat'},secondary:{label:'Xem thực đơn',path:'/thuc-don'}},
  cook:{icon:CookingPot,kicker:'BẾP NÓNG · CA SÁNG',title:'Theo dõi từng mẻ nấu.',description:'Tập trung vào món đang thực hiện, thời điểm hoàn thành và bàn giao nội bộ.',metrics:[{label:'Món trong kế hoạch',value:'5',note:'Bữa trưa DEMO'},{label:'Đang chế biến',value:'2',note:'Theo trạng thái nội bộ'},{label:'Suất dự kiến',value:'1.061',note:'Cho hai trường nhận'},{label:'Bàn giao dự kiến',value:'08:45',note:'Sang khu chia suất'}],tasks:[{id:'cook-main',time:'06:40',title:'Món mặn · mẻ 01',detail:'Theo dõi thời điểm bắt đầu và kết thúc.'},{id:'cook-soup',time:'07:00',title:'Canh rau củ',detail:'Đối chiếu định lượng theo thực đơn.'},{id:'cook-handover',time:'08:35',title:'Bàn giao món hoàn thành',detail:'Xác nhận nội bộ với khu chia suất.'}],primary:{label:'Xem thực đơn hôm nay',path:'/thuc-don'},secondary:{label:'Xem giám sát & an toàn',path:'/giam-sat'}},
  packing:{icon:PackageCheck,kicker:'CHIA SUẤT & ĐÓNG GÓI',title:'Đủ suất trước giờ xuất bếp.',description:'Theo dõi tiến độ đóng gói theo từng trường và đối chiếu QR riêng của từng món ăn.',metrics:[{label:'Tổng suất dự kiến',value:'1.061',note:'Chờ số thực xuất'},{label:'Đã đóng gói',value:'485',note:'Tiến độ DEMO'},{label:'Điểm giao',value:'2',note:'Hai trường được phân công'},{label:'Hạn hoàn thành',value:'09:15',note:'Trước khi bàn giao'}],tasks:[{id:'pack-label',time:'08:30',title:'Chuẩn bị QR theo từng món',detail:'Mỗi món của từng bữa có đúng một mã truy xuất.'},{id:'pack-count',time:'08:45',title:'Đối chiếu số suất đóng gói',detail:'Kiểm đếm trước khi niêm phong.'},{id:'pack-handover',time:'09:10',title:'Bàn giao điều phối',detail:'Ghi nhận số suất thực tế của từng trường.'}],primary:{label:'Mở QR từng món ăn',path:'/ma-qr-suat-an'},secondary:{label:'Xem giám sát & an toàn',path:'/giam-sat'}},
  dispatcher:{icon:Route,kicker:'ĐIỀU PHỐI GIAO NHẬN',title:'Đúng chuyến, đúng trường, đúng giờ.',description:'Kiểm soát số suất, QR từng món, người giao và trạng thái xuất bếp của từng chuyến.',metrics:[{label:'Chuyến hôm nay',value:'2',note:'Theo kế hoạch DEMO'},{label:'Suất chờ giao',value:'1.061',note:'Chưa phải số thực xuất'},{label:'Món có QR',value:'2',note:'Đối chiếu theo bữa'},{label:'Chuyến đầu',value:'09:30',note:'Tiểu học An Phú'}],tasks:[{id:'dispatch-vehicle',time:'08:50',title:'Kiểm tra phương tiện giao nhận',detail:'Rà soát thông tin chuyến và người phụ trách.'},{id:'dispatch-portion',time:'09:10',title:'Nhận bàn giao số suất',detail:'Đối chiếu số thực xuất và QR của từng món.'},{id:'dispatch-event',time:'09:30',title:'Ghi nhận mốc xuất bếp',detail:'Chỉ ghi cho chuyến thuộc bếp được phân công.'}],primary:{label:'Cập nhật giám sát & an toàn',path:'/giam-sat'},secondary:{label:'Đối chiếu QR món ăn',path:'/ma-qr-suat-an'}},
  sanitation:{icon:SprayCan,kicker:'VỆ SINH & BÀN GIAO KHU VỰC',title:'Giữ nhịp vệ sinh xuyên suốt ca.',description:'Checklist trước, trong và sau chế biến cho từng khu vực được phân công.',metrics:[{label:'Khu vực theo dõi',value:'6',note:'Phạm vi bếp DEMO'},{label:'Đã kiểm tra',value:'4/6',note:'Theo checklist trên máy'},{label:'Lượt trong ca',value:'3',note:'Đầu ca · giữa ca · cuối ca'},{label:'Bàn giao cuối ca',value:'14:30',note:'Theo lịch minh họa'}],tasks:[{id:'clean-start',time:'05:30',title:'Kiểm tra vệ sinh đầu ca',detail:'Khu sơ chế, bếp nóng và dụng cụ.'},{id:'clean-mid',time:'09:20',title:'Vệ sinh sau đóng gói',detail:'Khu chia suất và lối bàn giao.'},{id:'clean-end',time:'14:00',title:'Checklist cuối ca',detail:'Ghi nhận khu vực đã hoàn tất bàn giao.'}],primary:{label:'Xem hồ sơ giám sát',path:'/giam-sat'},secondary:{label:'Xem giấy tờ & điều kiện',path:'/ho-so'}},
}

function readCompleted(role:CentralKitchenRole,date:string,kitchenId:string):string[]{
 try {
  const value:unknown=JSON.parse(localStorage.getItem(`kitchen-tasks-${kitchenId}-${role}-${date}`)??'[]')
  return Array.isArray(value)&&value.every(item=>typeof item==='string')?value:[]
 } catch{return []}
}

export default function CentralKitchenRoleDashboard({role,date}:{role:CentralKitchenRole;date:string}){
  const view=roleViews[role]
  const queryClient=useQueryClient()
  const Icon=view.icon
  const user=getStoredUser()
  const real=user?.role==='CENTRAL_KITCHEN'&&!!user.kitchenId
  const kitchenQuery=useQuery({queryKey:['dashboard-kitchen',user?.kitchenId],queryFn:fetchMyKitchenContext,enabled:real})
  const plansQuery=useQuery({queryKey:['dashboard-meal-plans',user?.kitchenId],queryFn:loadMealPlanWorkspace,enabled:real})
  const legalQuery=useQuery({queryKey:['dashboard-legal',user?.kitchenId],queryFn:listKitchenLegal,enabled:real})
  const kitchenId=user?.kitchenId??'demo'
  const [localCompleted,setLocalCompleted]=useState<string[]>(()=>readCompleted(role,date,kitchenId))
  const [saving,setSaving]=useState<string|null>(null)
  const [taskError,setTaskError]=useState('')
  const shiftQuery=useQuery({queryKey:['kitchen-shift',kitchenId,date,role],queryFn:()=>getKitchenShiftTasks(date,role),enabled:real})
  const completed=real?(shiftQuery.data??[]).filter(item=>item.completed).map(item=>item.taskId):localCompleted
  useEffect(()=>{setLocalCompleted(readCompleted(role,date,kitchenId));setTaskError('')},[role,date,kitchenId])
  const assignedSchools=kitchenQuery.data?.kitchen.schools??[]
  const schoolIds=new Set(assignedSchools.map(item=>item.school.id))
  const plans=(plansQuery.data?.plans??[]).filter(plan=>schoolIds.has(plan.schoolId)&&plan.serviceDate.slice(0,10)===date)
  const approved=plans.map(plan=>plan.revisions.find(rev=>rev.status==='APPROVED')).filter((rev):rev is NonNullable<typeof rev>=>!!rev)
  const servings=approved.reduce((sum,revision)=>sum+revision.ageGroups.reduce((n,g)=>n+g.plannedServings,0),0)
  const dishes=new Set(approved.flatMap(revision=>revision.items.map(item=>item.dishVersion.dish.name)))
  const documents=legalQuery.data??[]
  const reviewDue=documents.filter(doc=>doc.status==='expiring'||doc.status==='missing'||(!!doc.expiresAt&&doc.expiresAt<=new Date(Date.now()+60*86400000).toISOString().slice(0,10))).length
  const dataLoading=kitchenQuery.isPending||plansQuery.isPending||legalQuery.isPending
  const dataError=kitchenQuery.isError||plansQuery.isError||legalQuery.isError
  const formatted=(value:number)=>value.toLocaleString('vi-VN')
  const computed=(label:string):{value:string;note:string}|null=>{
    if(label==='Trường nhận'||label==='Điểm giao')return{value:formatted(assignedSchools.length),note:'Trường được phân công cho bếp'}
    if(['Suất dự kiến','Tổng suất dự kiến'].includes(label))return{value:formatted(servings),note:'Từ thực đơn đã duyệt trong ngày'}
    if(label==='Món cần chế biến'||label==='Món trong kế hoạch')return{value:formatted(dishes.size),note:'Món thuộc thực đơn được duyệt trong ngày'}
    if(label==='Hồ sơ cần rà soát')return{value:formatted(reviewDue),note:'Hồ sơ thiếu, sắp hết hạn hoặc đã đánh dấu cần rà soát'}
    return null
  }
  const metrics=real?view.metrics.map(metric=>{
    if(dataLoading)return{...metric,value:'…',note:'Đang tải dữ liệu hệ thống'}
    if(dataError)return{...metric,value:'—',note:'Không tải được dữ liệu hệ thống'}
    const actual=computed(metric.label)
    return {...metric,...(actual??{value:'—',note:'Chưa có dữ liệu nghiệp vụ được ghi nhận'})}
  }):view.metrics
  const progress=Math.round(completed.length/view.tasks.length*100)
  const today=new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})
  const toggle=async(id:string)=>{
    if(real){
      if(saving||shiftQuery.isPending||shiftQuery.isError)return
      setSaving(id);setTaskError('')
      try{
        await updateKitchenShiftTask(date,role,id,!completed.includes(id))
        await queryClient.invalidateQueries({queryKey:['kitchen-shift',kitchenId,date,role]})
      }catch(error){setTaskError(error instanceof Error?error.message:'Không thể lưu checklist.')}
      finally{setSaving(null)}
      return
    }
    const next=completed.includes(id)?completed.filter(item=>item!==id):[...completed,id]
    setLocalCompleted(next)
    localStorage.setItem(`kitchen-tasks-${kitchenId}-${role}-${date}`,JSON.stringify(next))
  }
  const status=useMemo(()=>completed.length===view.tasks.length?'Đã hoàn thành checklist':completed.length?'Đang thực hiện':'Chưa bắt đầu',[completed.length,view.tasks.length])
  return <div className="kitchen-role-dashboard">
    <section className="card kitchen-role-hero"><div className="kitchen-role-icon"><Icon size={27}/></div><div><span>{view.kicker}</span><h2>{view.title}</h2><p>{real?view.description.replace('Bếp trung tâm An Tâm',kitchenQuery.data?.kitchen.name??'bếp được phân công'):view.description}</p></div><div className="kitchen-role-identity"><small>VAI TRÒ ĐANG XEM</small><strong>{centralKitchenRoleLabels[role]}</strong><em>{real?'Dữ liệu hệ thống':'Frontend DEMO'} · {today}</em></div></section>
    <div className="kitchen-role-metrics">{metrics.map(metric=><article className="card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div>
    <div className="kitchen-role-grid"><section className="card kitchen-task-card"><header><div><span className="section-kicker">CÔNG VIỆC TRONG CA</span><h2>Checklist ưu tiên</h2></div><div className="task-progress"><strong>{completed.length}/{view.tasks.length}</strong><span>{status}</span></div></header><div className="task-progress-track" aria-label={`Tiến độ ${progress}%`}><i style={{width:`${progress}%`}}/></div><div className="kitchen-task-list">{view.tasks.map(task=><button className={completed.includes(task.id)?'completed':''} onClick={()=>{void toggle(task.id)}} disabled={!!saving||(real&&(shiftQuery.isPending||shiftQuery.isError))} key={task.id} aria-pressed={completed.includes(task.id)}><span className="task-check">{completed.includes(task.id)?<Check size={16}/>:<Clock3 size={15}/>}</span><time>{real?'—':task.time}</time><div><strong>{task.title}</strong><p>{real?task.detail.replace('hai trường','các trường được phân công').replace('2 trường','các trường được phân công').replace('5 món','các món trong thực đơn').replace('phiếu DEMO','phiếu nghiệp vụ'):task.detail}</p></div></button>)}</div>{real&&shiftQuery.isPending&&<p className="muted">Đang tải checklist trong ca…</p>}{real&&shiftQuery.isError&&<p role="alert">Không tải được checklist. Vui lòng thử tải lại trang.</p>}{taskError&&<p role="alert">{taskError}</p>}<p className="kitchen-task-note"><ShieldCheck size={15}/>{real?'Checklist được lưu theo bếp, ngày và vai trò trên hệ thống; không thay thế hồ sơ nghiệp vụ.':'Checklist DEMO chỉ lưu trên trình duyệt; không thay thế hồ sơ nghiệp vụ.'}</p></section>
      <aside className="card kitchen-role-actions"><div className="kitchen-role-action-heading"><Sparkles size={20}/><div><span className="section-kicker">LỐI TẮT THEO VAI TRÒ</span><h2>Tiếp tục công việc</h2></div></div><Link className="primary" to={view.primary.path}>{view.primary.label}<ArrowRight size={16}/></Link><Link className="outline" to={view.secondary.path}>{view.secondary.label}<ArrowRight size={16}/></Link><div className="shift-summary"><CalendarClock size={18}/><div><small>CA ĐANG ÁP DỤNG</small><strong>{real?'Chưa có lịch ca được ghi nhận':role==='packing'||role==='dispatcher'?'Ca hành chính · 07:00–15:00':'Ca sáng · 05:30–13:30'}</strong><span>{real?(kitchenQuery.data?.kitchen.name??'Đang tải thông tin bếp')+' · Dữ liệu hệ thống': 'Bếp trung tâm An Tâm · Dữ liệu DEMO'}</span></div></div></aside>
    </div>
  </div>
}
