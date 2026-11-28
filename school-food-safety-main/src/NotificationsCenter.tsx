import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CircleCheck, RefreshCw } from 'lucide-react';
import { getAccessToken, getStoredUser } from './lib/authApi';
import { loadNotifications, readAllNotifications, readNotification, streamNotifications } from './lib/notificationsApi';
import './NotificationsCenter.css';
import { useUI } from './lib/store';

const inboxKey=(id:string)=>['account-notifications',id];
export function NotificationBell({onOpen}:{onOpen:()=>void}){
  const user=getStoredUser(),id=user?.id??'';
  const qc=useQueryClient();
  const enabled=Boolean(id&&getAccessToken());
  const query=useQuery({queryKey:inboxKey(id),queryFn:loadNotifications,enabled,refetchInterval:30000,staleTime:2000});
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    void streamNotifications(()=>{void qc.invalidateQueries({queryKey:inboxKey(id)})},controller.signal);
    return ()=>controller.abort();
  },[enabled,id,qc]);
  const count=query.data?.unread??0;
  return <button type="button" className="icon-button notification-button app-notification-bell"
      title={count?count+' thông báo chưa đọc':'Thông báo của bạn'}
      aria-label={count?`Thông báo: ${count} chưa đọc`:'Thông báo'}
      onClick={onOpen}>
      <Bell size={19}/>
      {count>0&&<span className="app-notification-count">{count>99?'99+':count}</span>}
    </button>;
}
export function NotificationsPanel({onClose}:{onClose:()=>void}){
 const user=getStoredUser(),id=user?.id??'';
 const qc=useQueryClient(),navigate=useNavigate(),setSchool=useUI(state=>state.setSchool);
 const [onlyUnread,setOnlyUnread]=useState(false);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState('');
 const query=useQuery({queryKey:inboxKey(id),queryFn:loadNotifications,enabled:!!id});
 const items=(query.data?.items??[]).filter(item=>!onlyUnread||!item.readAt);
 const invalidate=()=>qc.invalidateQueries({queryKey:inboxKey(id)});
 const open=async(item:typeof items[number])=>{
   if(busy)return;setBusy(item.id);setError('');
   try{
     if(!item.readAt)await readNotification(item.id);
     await invalidate();
     if(item.targetPath.startsWith('/')&&!item.targetPath.startsWith('//')&&!item.targetPath.includes('://')){
       if(item.schoolId)setSchool(item.schoolId);
       navigate(item.targetPath);onClose();
     }
   }catch{setError('Không thể đánh dấu thông báo đã đọc.')}
   finally{setBusy(null)}
 };
 const readAll=async()=>{
   if(busy)return;setBusy('all');setError('');
   try{await readAllNotifications();await invalidate()}catch{setError('Không thể đánh dấu tất cả đã đọc.')}finally{setBusy(null)}
 };
 if(!id)return <p className="muted">Đăng nhập để xem thông báo thuộc tài khoản.</p>;
 return <div className="app-notification-panel">
   <div className="app-notification-toolbar">
     <div className="app-notification-switch" role="group" aria-label="Lọc thông báo">
       <button type="button" className={!onlyUnread?'selected':''} onClick={()=>setOnlyUnread(false)}>Tất cả</button>
       <button type="button" className={onlyUnread?'selected':''} onClick={()=>setOnlyUnread(true)}>Chưa đọc ({query.data?.unread??0})</button>
     </div>
     <button className="app-notification-mark" type="button" disabled={!query.data?.unread||!!busy} onClick={()=>void readAll()}><CheckCheck size={15}/> Đánh dấu tất cả đã đọc</button>
   </div>
   {error&&<p className="app-notification-error" role="alert">{error}</p>}
   {query.isLoading&&<div className="app-notification-empty"><RefreshCw size={25}/><p>Đang tải thông báo…</p></div>}
   {query.isError&&<div className="app-notification-empty"><p>Không thể tải thông báo từ máy chủ.</p><button type="button" className="outline" onClick={()=>void query.refetch()}>Thử lại</button></div>}
   {!query.isLoading&&!query.isError&&!items.length&&<div className="app-notification-empty">
     <Bell size={32}/><h3>{onlyUnread?'Không có thông báo chưa đọc':'Chưa có thông báo'}</h3>
   </div>}
   {!!items.length&&<div className="app-notification-list">{items.map(item=><button type="button" key={item.id}
     className={'app-notification-item'+(!item.readAt?' unread':'')} disabled={!!busy} onClick={()=>void open(item)}>
     <span className="app-notification-item-icon">{item.readAt?<CircleCheck size={18}/>:<Bell size={18}/>}</span>
     <span className="app-notification-item-body"><strong>{item.title}</strong><span>{item.body}</span>
       <small>{new Date(item.createdAt).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}</small></span>
     {!item.readAt&&<span className="app-notification-dot" aria-label="Chưa đọc"/>}
   </button>)}</div>}
 </div>;
}
