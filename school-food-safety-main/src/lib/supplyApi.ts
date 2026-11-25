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
export type SupplySupplier={id:string;code:string;name:string;taxCode:string|null;contactName:string|null;phone:string|null;email:string|null;address:string|null;status:'ACTIVE'|'INACTIVE';note:string|null}
export type SupplyIngredient={id:string;code:string;name:string;unit:string;category:string|null}
export type SupplyLot={id:string;lotCode:string;ingredientId:string;supplierId:string;quantity:number;remainingQty:number;unit:string;receivedAt:string;expiryDate:string|null;status:'AVAILABLE'|'QUARANTINED'|'EXPIRED'|'DEPLETED';storageLocation:string|null;ingredient:{id:string;name:string;unit:string};supplier:{id:string;name:string;contactName:string|null;phone:string|null}}
export type SupplyMovement={id:string;eventType:string;occurredAt:string;description:string|null;metadata:unknown;lot:{lotCode:string;ingredient:{name:string}}}
export const getSupplyKitchens=()=>request<SupplyKitchen[]>('/kitchens')
export const getSupplySuppliers=(id:string)=>request<SupplySupplier[]>(kitchenPath(id)+'/suppliers')
export const getSupplySchools=(id:string)=>request<{id:string;name:string}[]>(kitchenPath(id)+'/schools')
export const getSupplyIngredients=(id:string)=>request<SupplyIngredient[]>(kitchenPath(id)+'/ingredients')
export const getSupplyLots=(id:string)=>request<SupplyLot[]>(kitchenPath(id)+'/lots')
export const getSupplyMovements=(id:string)=>request<SupplyMovement[]>(kitchenPath(id)+'/movements')
export const saveSupplySupplier=(kitchenId:string,input:{code:string;name:string;taxCode:string;contactName:string;phone:string;email:string;address:string;note:string},id?:string)=>request<SupplySupplier>(kitchenPath(kitchenId)+'/suppliers'+(id?'/'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',body:JSON.stringify(input)})
export type StockEvidenceInput={category:'DELIVERY_NOTE'|'LOT_PHOTO'|'INVOICE'|'QUALITY_CERTIFICATE'|'ISSUE_PHOTO'|'SCALE_PHOTO'|'RETURN_PHOTO'|'OTHER';filename:string;mimeType:string;base64:string}
export type StockInspection={
 inspector:string;counterparty:string;location:string;documentNumber:string;actualTime:string;temperatureC:string;
 documents:'PASS'|'PENDING';packaging:'PASS'|'PENDING';sensory:'PASS'|'PENDING';transport:'PASS'|'PENDING';quantity:'PASS'|'PENDING';weighing:'PASS'|'PENDING';remarks:string;
 approvedPlan?:{revisionId:string;ingredientId:string;dishVersionIds:string[]};
}
export type StockVoucher={
 id:string;kind:'RECEIPT'|'ISSUE'|'RETURN';status:string;number:string;postedAt:string;postedById:string;postedByName:string;inspection:StockInspection;schoolId:string|null;lotId:string|null;
 quantity:number|null;unit:string|null;
 receipt?:{id:string;number:string;supplier:{name:string};lines:Array<{lot:{lotCode:string;ingredient:{name:string;unit:string}};quantity:string}>}|null;
 evidences:Array<{id:string;category:string;filename:string;mimeType:string;size:number;sha256:string;createdAt:string}>;
}
export const returnSupplyIssue=(kitchenId:string,sourceVoucherId:string,input:{voucherNumber:string;quantity:number;unit:string;reason:string;unusedAndSafe:boolean;inspection:StockInspection;evidences:StockEvidenceInput[]})=>
 request<{voucherId:string;sourceVoucherId:string;lotId:string;quantity:number;remainingQty:number}>(kitchenPath(kitchenId)+'/vouchers/'+encodeURIComponent(sourceVoucherId)+'/returns',{method:'POST',body:JSON.stringify(input)})
export const getStockVouchers=(kitchenId:string)=>request<StockVoucher[]>(kitchenPath(kitchenId)+'/vouchers')
export const downloadStockVoucherEvidence=(kitchenId:string,voucherId:string,evidenceId:string)=>request<{filename:string;mimeType:string;sha256:string;base64:string}>(kitchenPath(kitchenId)+'/vouchers/'+encodeURIComponent(voucherId)+'/evidences/'+encodeURIComponent(evidenceId))
export const receiveSupplyLot=(kitchenId:string,input:{lotCode:string;ingredientId:string;supplierId:string;quantity:number;unit?:string;expiryDate:string;storageLocation:string;note:string})=>request<SupplyLot>(kitchenPath(kitchenId)+'/receipts',{method:'POST',body:JSON.stringify(input)})
export type SupplyApprovedPlan={id:string;revisionId:string;revisionNo:number;schoolId:string;schoolName:string;serviceDate:string;mealType:'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK';approvedAt:string|null}
export type SupplyIngredientRequirement={
 ingredientId:string;name:string;unit:string;plannedQuantity:number;issueQuantity:number;stockAvailable:number;shortage:number;
 dishes:Array<{dishVersionId:string;name:string;quantity:number}>;
}
export type SupplyApprovedRequirements={
 revisionId:string;revisionNo:number;schoolId:string;schoolName:string;serviceDate:string;mealType:string;
 ageGroups:Array<{name:string;plannedServings:number}>;items:SupplyIngredientRequirement[];warnings:string[];
}
export const getSupplyApprovedPlans=(kitchenId:string)=>request<SupplyApprovedPlan[]>(kitchenPath(kitchenId)+'/approved-plans')
export const getSupplyIngredientRequirements=(kitchenId:string,revisionId:string)=>request<SupplyApprovedRequirements>(kitchenPath(kitchenId)+'/approved-plans/'+encodeURIComponent(revisionId)+'/requirements')
export const issueSupplyLot=(kitchenId:string,lotId:string,input:{quantity:number;unit:string;note:string;schoolId:string;serviceDate:string;mealType:'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK';voucherNumber:string;inspection:StockInspection;evidences:StockEvidenceInput[];mealPlanRevisionId?:string;ingredientId?:string})=>request<{lotId:string;quantity:number;remainingQty:number}>(kitchenPath(kitchenId)+'/lots/'+encodeURIComponent(lotId)+'/issues',{method:'POST',body:JSON.stringify(input)})
export const updateSupplySupplierStatus=(kitchenId:string,supplierId:string,status:'ACTIVE'|'INACTIVE')=>request<SupplySupplier>(kitchenPath(kitchenId)+'/suppliers/'+encodeURIComponent(supplierId)+'/status',{method:'PATCH',body:JSON.stringify({status})})

export type SupplyFinance = {
  totals:{suppliers:number;activeSuppliers:number;totalPurchase:number;paid:number;debt:number;unpricedLots:number}
  suppliers:{id:string;code:string;name:string;status:'ACTIVE'|'INACTIVE';totalPurchase:number;paid:number;debt:number;receipts:number}[]
  receipts:{id:string;number:string;invoiceNumber:string|null;reference:string|null;description:string|null;createdAt:string;total:number;paid:number;debt:number;
    supplier:{id:string;name:string;code:string};
    lines:{id:string;quantity:number;enteredQuantity:number|null;enteredUnit:string|null;unitPrice:number;amount:number;lot:{id:string;lotCode:string;ingredient:{name:string;unit:string}}}[]}[]
  payments:{id:string;reference:string;amount:number;method:string;paidAt:string;note:string|null;reversedAt:string|null;reversalReason:string|null;receipt:{id:string;number:string};supplier:{id:string;name:string}}[]
}
export type SupplyPurchaseLine={ingredientId:string;lotCode:string;quantity:number;deliveredQuantity:number;rejectionReason:string;origin:string;producer:string;packagingStatus:'PASS'|'PENDING';sensoryStatus:'PASS'|'PENDING';unit:string;unitPrice:number;expiryDate:string;storageLocation:string}
export const getSupplyFinance=(id:string)=>request<SupplyFinance>(kitchenPath(id)+'/finance')
export const createSupplyPurchase=(id:string,input:{number:string;supplierId:string;invoiceNumber:string;reference:string;description:string;lines:SupplyPurchaseLine[];inspection:StockInspection;evidences:StockEvidenceInput[]})=>request<{id:string;number:string;total:number;lines:number}>(kitchenPath(id)+'/purchase-receipts',{method:'POST',body:JSON.stringify(input)})
export const createSupplyPayment=(id:string,input:{receiptId:string;reference:string;amount:number;method:'BANK_TRANSFER'|'CASH'|'OTHER';paidAt:string;note:string})=>request<{id:string;reference:string;amount:number}>(kitchenPath(id)+'/payments',{method:'POST',body:JSON.stringify(input)})

export type SupplierDocument = {id:string;category:string;receiptId:string|null;filename:string;mimeType:string;size:number;documentNumber:string|null;issuer:string|null;issuedAt:string|null;expiresAt:string|null;createdAt:string}
const docPath=(kitchenId:string,supplierId:string)=>kitchenPath(kitchenId)+'/suppliers/'+encodeURIComponent(supplierId)+'/documents'
export const getSupplierDocuments=(kitchenId:string,supplierId:string)=>request<SupplierDocument[]>(docPath(kitchenId,supplierId))
export const uploadSupplierDocument=(kitchenId:string,supplierId:string,input:{category:string;receiptId:string;filename:string;mimeType:string;base64:string;documentNumber:string;issuer:string;issuedAt:string;expiresAt:string})=>request<SupplierDocument>(docPath(kitchenId,supplierId),{method:'POST',body:JSON.stringify(input)})
export const downloadSupplierDocument=(kitchenId:string,supplierId:string,id:string)=>request<{filename:string;mimeType:string;base64:string}>(docPath(kitchenId,supplierId)+'/'+encodeURIComponent(id))
export const archiveSupplierDocument=(kitchenId:string,supplierId:string,id:string)=>request<{id:string;isArchived:boolean}>(docPath(kitchenId,supplierId)+'/'+encodeURIComponent(id),{method:'DELETE'})

export const changeSupplyLotStatus=(kitchenId:string,lotId:string,status:'AVAILABLE'|'QUARANTINED',note:string)=>request<{lotId:string;status:string}>(kitchenPath(kitchenId)+'/lots/'+encodeURIComponent(lotId)+'/status',{method:'PATCH',body:JSON.stringify({status,note})})
export const moveSupplyLot=(kitchenId:string,lotId:string,location:string,note:string)=>request<{lotId:string;location:string}>(kitchenPath(kitchenId)+'/lots/'+encodeURIComponent(lotId)+'/location',{method:'PATCH',body:JSON.stringify({location,note})})

export const importSupplySuppliers=(kitchenId:string,rows:unknown[])=>request<{imported:number;financialDataImported:false}>(kitchenPath(kitchenId)+'/suppliers/import',{method:'POST',body:JSON.stringify(rows)})

export const reverseSupplyPayment=(kitchenId:string,paymentId:string,reason:string)=>request<{id:string;reversed:true}>(kitchenPath(kitchenId)+'/payments/'+encodeURIComponent(paymentId)+'/reverse',{method:'POST',body:JSON.stringify({reason})})

export type SupplyMinimum={ingredientId:string;minimumQty:string;ingredient:{name:string;unit:string}}
export const getSupplyMinimums=(kitchenId:string)=>request<SupplyMinimum[]>(kitchenPath(kitchenId)+'/minimums')
export const setSupplyMinimum=(kitchenId:string,ingredientId:string,minimumQty:number,unit:string)=>request<SupplyMinimum>(kitchenPath(kitchenId)+'/minimums/'+encodeURIComponent(ingredientId),{method:'PUT',body:JSON.stringify({minimumQty,unit})})
