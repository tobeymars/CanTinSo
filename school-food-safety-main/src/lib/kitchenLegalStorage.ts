/** Local-only DEMO repository. Never use for production evidence or sensitive documents. */
import type { KitchenDocument } from './data'

export type LegalAttachment = { id: string; name: string; type: string; size: number; addedAt: string }
export type LegalDocument = KitchenDocument & { attachments: LegalAttachment[]; custom?: boolean }
const KEY = 'demo-kitchen-legal-v1'
const DATABASE = 'demo-kitchen-legal-attachments-v1'
const MAX_FILE = 8 * 1024 * 1024
const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function parseStored(schoolId: string): Record<string, Partial<LegalDocument>> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(`${KEY}:${schoolId}`) ?? '{}')
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {}
    return raw as Record<string, Partial<LegalDocument>>
  } catch { return {} }
}
export function readLegalDocuments(schoolId: string, defaults: KitchenDocument[]): LegalDocument[] {
  const stored = parseStored(schoolId)
  const known = new Map(defaults.map(item => [item.id, item]))
  const merged: LegalDocument[] = defaults.map(item => ({...item, ...(stored[item.id] ?? {}), id:item.id, custom:false, attachments: Array.isArray(stored[item.id]?.attachments) ? stored[item.id]!.attachments! : []}))
  for (const [key, record] of Object.entries(stored)) {
    if (known.has(key) || !record.custom || typeof record.title !== 'string' || typeof record.category !== 'string') continue
    merged.push({
      id:key, title:record.title, category:record.category, status:record.status ?? 'missing',
      applicability:record.applicability ?? 'conditional', documentNumber:record.documentNumber, issuer:record.issuer,
      issuedAt:record.issuedAt, expiresAt:record.expiresAt, updatedAt:record.updatedAt,
      note:record.note ?? '', publicSummary:record.publicSummary ?? 'Chưa có nội dung được công khai.',
      attachments:Array.isArray(record.attachments) ? record.attachments : [], custom:true,
    })
  }
  return merged
}
export function persistLegalDocument(schoolId:string, value:LegalDocument) {
  const stored=parseStored(schoolId)
  stored[value.id]=value
  localStorage.setItem(`${KEY}:${schoolId}`,JSON.stringify(stored))
  window.dispatchEvent(new CustomEvent('demo-kitchen-legal-updated',{detail:{schoolId}}))
}
export function removeLegalDocument(schoolId:string, id:string) {
  const stored=parseStored(schoolId)
  delete stored[id]
  localStorage.setItem(`${KEY}:${schoolId}`,JSON.stringify(stored))
  window.dispatchEvent(new CustomEvent('demo-kitchen-legal-updated',{detail:{schoolId}}))
}
function openDatabase():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (!('indexedDB' in window)) { reject(new Error('Trình duyệt không hỗ trợ lưu tệp cục bộ.'));return }
    const req=indexedDB.open(DATABASE,1)
    req.onupgradeneeded=()=>{if (!req.result.objectStoreNames.contains('files')) req.result.createObjectStore('files')}
    req.onerror=()=>reject(req.error??new Error('Không mở được kho tệp cục bộ.'))
    req.onsuccess=()=>resolve(req.result)
  })
}
async function performFile<T>(mode:IDBTransactionMode, action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await openDatabase()
  return new Promise((resolve,reject)=>{
    let value:T
    const tx=db.transaction('files',mode)
    const req=action(tx.objectStore('files'))
    req.onsuccess=()=>{value=req.result}
    req.onerror=()=>reject(req.error??new Error('Không thể xử lý tệp đính kèm.'))
    tx.oncomplete=()=>{db.close();resolve(value)}
    tx.onerror=()=>{db.close();reject(tx.error??new Error('Lỗi lưu tệp cục bộ.'))}
    tx.onabort=()=>{db.close();reject(tx.error??new Error('Lưu tệp bị hủy.'))}
  })
}
export function validateLegalFiles(files:File[],currentCount:number):string|null {
  if(currentCount+files.length>8) return 'Tối đa 8 tệp đính kèm cho một hồ sơ.'
  for(const file of files) {
    if(!allowed.includes(file.type))return `Không hỗ trợ định dạng: ${file.name}. Chỉ PDF, JPG, PNG, WebP.`
    if(file.size>MAX_FILE)return `${file.name} vượt quá 8 MB.`
    if(file.size===0)return `${file.name} là tệp trống.`
  }
  return null
}
export async function saveLegalFile(id:string,file:File):Promise<void> {
  await performFile('readwrite',store=>store.put(file,id))
}
export async function getLegalFile(id:string):Promise<Blob|undefined>{
  return performFile('readonly',store=>store.get(id)) as Promise<Blob|undefined>
}
export async function deleteLegalFile(id:string):Promise<void>{await performFile('readwrite',store=>store.delete(id))}
export async function downloadLegalFile(file:LegalAttachment){
  const data=await getLegalFile(file.id)
  if(!data)throw new Error('Không tìm thấy nội dung tệp trên thiết bị này. Dữ liệu không đồng bộ giữa các máy.')
  const url=URL.createObjectURL(data)
  const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
