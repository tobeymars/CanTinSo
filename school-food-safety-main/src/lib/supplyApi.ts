import { getAccessToken } from './authApi'
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
async function request<T>(path:string,init?:RequestInit):Promise<T> {
  const token=getAccessToken()
  if(!token) throw Error('Vui lòng đăng nhập.')
  const response=await fetch(`${BASE}/supply${path}`,{
    ...init,headers:{Authorization:`Bearer ${token}`,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers},
  })
  if(!response.ok){
    const body=await response.json().catch(()=>null)
    throw Error(Array.isArray(body?.message)?body.message.join(', '):body?.message||'Không tải được dữ liệu kho.')
  }
  return response.json() as Promise<T>
}
const kitchenPath=(id:string)=>'/'+encodeURIComponent(id)
export type SupplyKitchen={id:string;name:string;type:'CENTRAL'|'SCHOOL'}
export type SupplySupplier={id:string;code:string;name:string;taxCode:string|null;contactName:string|null;phone:string|null;email:string|null;address:string|null;status:'ACTIVE'|'INACTIVE'}
export type SupplyIngredient={id:string;code:string;name:string;unit:string;category:string|null}
export type SupplyLot={id:string;lotCode:string;ingredientId:string;supplierId:string;quantity:number;remainingQty:number;unit:string;receivedAt:string;expiryDate:string|null;status:'AVAILABLE'|'QUARANTINED'|'EXPIRED'|'DEPLETED';storageLocation:string|null;ingredient:{id:string;name:string;unit:string};supplier:{id:string;name:string;contactName:string|null;phone:string|null}}
export type SupplyMovement={id:string;eventType:string;occurredAt:string;description:string|null;metadata:unknown;lot:{lotCode:string;ingredient:{name:string}}}
export const getSupplyKitchens=()=>request<SupplyKitchen[]>('/kitchens')
export const getSupplySuppliers=(id:string)=>request<SupplySupplier[]>(kitchenPath(id)+'/suppliers')
export const getSupplyIngredients=(id:string)=>request<SupplyIngredient[]>(kitchenPath(id)+'/ingredients')
export const getSupplyLots=(id:string)=>request<SupplyLot[]>(kitchenPath(id)+'/lots')
export const getSupplyMovements=(id:string)=>request<SupplyMovement[]>(kitchenPath(id)+'/movements')
export const saveSupplySupplier=(kitchenId:string,input:{code:string;name:string;taxCode:string;contactName:string;phone:string;email:string;address:string},id?:string)=>request<SupplySupplier>(kitchenPath(kitchenId)+'/suppliers'+(id?'/'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',body:JSON.stringify(input)})
export const receiveSupplyLot=(kitchenId:string,input:{lotCode:string;ingredientId:string;supplierId:string;quantity:number;expiryDate:string;storageLocation:string;note:string})=>request<SupplyLot>(kitchenPath(kitchenId)+'/receipts',{method:'POST',body:JSON.stringify(input)})
export const issueSupplyLot=(kitchenId:string,lotId:string,input:{quantity:number;note:string})=>request<{lotId:string;quantity:number;remainingQty:number}>(kitchenPath(kitchenId)+'/lots/'+encodeURIComponent(lotId)+'/issues',{method:'POST',body:JSON.stringify(input)})
