import { getAccessToken } from './authApi';
const BASE=import.meta.env.VITE_API_BASE_URL||'http://localhost:3000/api/v1';
export type AppNotification={
 id:string;kind:string;title:string;body:string;targetPath:string;
 schoolId:string|null;kitchenId:string|null;createdAt:string;readAt:string|null
};
export type NotificationInbox={items:AppNotification[];unread:number};
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const token=getAccessToken();if(!token)throw Error('Vui lòng đăng nhập');
 const response=await fetch(BASE+'/notifications'+path,{...init,headers:{Authorization:'Bearer '+token,...init?.headers}});
 if(!response.ok)throw Error('Không thể cập nhật thông báo');
 return response.json() as Promise<T>;
}
export const loadNotifications=()=>request<NotificationInbox>('');
export const readNotification=(id:string)=>request<{ok:boolean}>('/'+encodeURIComponent(id)+'/read',{method:'PATCH'});
export const readAllNotifications=()=>request<{ok:boolean}>('/read-all',{method:'PATCH'});
/** Fetch-stream supports the JWT Authorization header (EventSource cannot attach it).
 * Reconnect with backoff; persistent inbox endpoint repairs missed events. */
export async function streamNotifications(onChange:()=>void,signal:AbortSignal):Promise<void>{
 let delay=1000;
 while(!signal.aborted&&getAccessToken()){
  try{
   const response=await fetch(BASE+'/notifications/stream',{
     headers:{Authorization:'Bearer '+getAccessToken(),Accept:'text/event-stream'},signal,cache:'no-store',
   });
   if(!response.ok||!response.body)throw Error('SSE unavailable');
   delay=1000;
   const reader=response.body.getReader(),decoder=new TextDecoder();
   let buffer='';
   while(!signal.aborted){
     const part=await reader.read();if(part.done)break;
     buffer+=decoder.decode(part.value,{stream:true});
     const messages=buffer.split(/\r?\n\r?\n/);
     buffer=messages.pop()??'';
     for(const message of messages)if(message.split(/\r?\n/).some(line=>line.startsWith('data:')&&line.includes('changed')))onChange();
   }
  }catch(e){if(signal.aborted)break}
  if(signal.aborted)break;
  await new Promise<void>(resolve=>{
    const timeout=setTimeout(resolve,delay);
    signal.addEventListener('abort',()=>{clearTimeout(timeout);resolve()},{once:true});
  });
  delay=Math.min(delay*2,15000);
  onChange();
 }
}
