import { getAccessToken } from './authApi'
import type { CentralKitchenRole } from './store'
const BASE=import.meta.env.VITE_API_BASE_URL||'http://localhost:3000/api/v1'
export type ShiftTaskRecord={taskId:string;completed:boolean;updatedAt:string}
async function request<T>(url:string,init?:RequestInit):Promise<T>{
 const token=getAccessToken()
 if(!token)throw Error('Vui lòng đăng nhập vào bếp trung tâm.')
 const response=await fetch(BASE+url,{...init,headers:{Authorization:`Bearer ${token}`,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}})
 if(!response.ok){const body=await response.json().catch(()=>null);throw Error(body?.message||'Không thể lưu công việc trong ca.')}
 return response.json() as Promise<T>
}
const endpoint=(date:string,role:CentralKitchenRole)=>`/users/kitchen-shift/${encodeURIComponent(date)}/${encodeURIComponent(role)}`
export const getKitchenShiftTasks=(date:string,role:CentralKitchenRole)=>request<ShiftTaskRecord[]>(endpoint(date,role))
export const updateKitchenShiftTask=(date:string,role:CentralKitchenRole,taskId:string,completed:boolean)=>request<ShiftTaskRecord>(endpoint(date,role)+'/'+encodeURIComponent(taskId),{method:'PATCH',body:JSON.stringify({completed})})
