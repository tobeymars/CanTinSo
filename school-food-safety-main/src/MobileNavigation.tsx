import { NavLink } from 'react-router-dom'
import { House, Utensils, MessageCircle, UserRound, Activity, Menu } from 'lucide-react'
import type { ViewRole } from './lib/store'
import './MobileApp.css'
type Props={role:ViewRole;account:()=>void;more:()=>void;accountOpen:boolean}
export default function MobileNavigation({role,account,more,accountOpen}:Props){

 const items=role==='parent'?[{path:'/',label:'Trang chủ',icon:House},{path:'/bua-an',label:'Bữa ăn',icon:Utensils},{path:'/giam-sat',label:'Giám sát',icon:Activity},{path:'/phan-anh',label:'Phản ánh',icon:MessageCircle}]:[{path:'/',label:'Tổng quan',icon:House},{path:'/thuc-don',label:'Thực đơn',icon:Utensils},{path:'/giam-sat',label:'Giám sát',icon:Activity}]
 return <nav className="mobile-tabbar" aria-label="Điều hướng chính trên điện thoại">{items.map(item=><NavLink key={item.path} to={item.path} end={item.path==='/'} className={({isActive})=>isActive&&!accountOpen?'tab-active':''}><span className="tab-icon"><item.icon size={22} strokeWidth={1.8}/></span><span>{item.label}</span></NavLink>)}{role!=='parent'&&<button onClick={more}><span className="tab-icon"><Menu size={22}/></span><span>Thêm</span></button>}<button className={accountOpen?'tab-active':''} onClick={account} aria-label="Tài khoản" aria-pressed={accountOpen}><span className="tab-icon"><UserRound size={22} strokeWidth={1.8}/></span><span>Tài khoản</span></button></nav>
}

