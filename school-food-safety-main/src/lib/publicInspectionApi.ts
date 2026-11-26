import { getAccessToken } from './authApi'
import type { SupervisionScope } from './supervisionStatus'

const BASE=import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
export type InspectionRecord={
 id:string;schoolId:string;serviceDate:string;mealType:string;
 recordNumber:string;title:string;authority:string;inspectedAt:string;
 scope:string;summary:string;findingCount:number;
 outcome:'follow_up_required'|'no_follow_up';evidenceReference:string;
 status:'DRAFT'|'PUBLISHED';createdAt:string;publishedAt:string|null;
}
export type InspectionDraft=Pick<InspectionRecord,'recordNumber'|'title'|'authority'|'inspectedAt'|'scope'|'summary'|'findingCount'|'outcome'|'evidenceReference'>
const endpoint=(scope:SupervisionScope)=>`${BASE}/supervision/${[scope.schoolId,scope.serviceDate,scope.mealType].map(encodeURIComponent).join('/')}/inspections`
async function call<T>(scope:SupervisionScope,suffix='',init?:RequestInit):Promise<T>{
 const token=getAccessToken()
 if(!token)throw Error('Vui lòng đăng nhập.')
 const response=await fetch(endpoint(scope)+suffix,{...init,headers:{Authorization:`Bearer ${token}`,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}})
 if(!response.ok){const body=await response.json().catch(()=>null);throw Error(Array.isArray(body?.message)?body.message.join(', '):body?.message||'Không thể truy cập hồ sơ kiểm tra.')}
 return response.json() as Promise<T>
}
export const getPublicInspections=(scope:SupervisionScope)=>call<InspectionRecord[]>(scope)
export const createPublicInspection=(scope:SupervisionScope,data:InspectionDraft)=>call<InspectionRecord>(scope,'',{method:'POST',body:JSON.stringify(data)})
export const publishPublicInspection=(scope:SupervisionScope,id:string)=>call<InspectionRecord>(scope,`/${encodeURIComponent(id)}/publish`,{method:'POST'})
