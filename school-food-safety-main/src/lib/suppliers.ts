/** Hồ sơ pháp lý DEMO: dữ liệu khai báo, không phải bằng chứng đã kiểm chứng. */
export type SupplierDocumentType = 'registration' | 'food_safety' | 'contract' | 'origin' | 'inspection' | 'other'
export const supplierDocumentTypes: ReadonlyArray<{id:SupplierDocumentType;label:string}> = [
  {id:'registration',label:'Đăng ký kinh doanh / quyết định thành lập'},
  {id:'food_safety',label:'Giấy chứng nhận / hồ sơ ATTP'},
  {id:'contract',label:'Hợp đồng cung ứng / phụ lục'},
  {id:'origin',label:'Chứng từ nguồn gốc / kiểm dịch'},
  {id:'inspection',label:'Phiếu kiểm nghiệm / kiểm tra tiếp nhận'},
  {id:'other',label:'Giấy phép / chứng từ khác'},
]
export type SupplierAttachment = {
  id:string
  type:SupplierDocumentType
  filename:string
  mimeType:string
  size:number
  addedAt:string
  dataUrl:string
  /** File lưu trong trình duyệt không phải chứng cứ đã được xác minh. */
  status:'unverified'
}
export type SupplierLegal = {
  applicability:string
  coreRecords:string[]
  documentNumber:string
  issuer:string
  issuedAt:string
  expiresAt:string
  reviewCycle:string
  updatedAt:string
  attachments:SupplierAttachment[]
}
export type Supplier = {
  id:string
  code:string
  name:string
  contact:string
  phone:string
  email:string
  address:string
  taxCode:string
  note:string
  debt:number
  totalPurchase:number
  status:'active'|'inactive'
  legal?:SupplierLegal
}

export const defaultCoreRecords = [
  'Đăng ký kinh doanh hoặc quyết định thành lập',
  'Hồ sơ chứng minh điều kiện an toàn thực phẩm (nếu áp dụng)',
  'Hợp đồng cung ứng và chứng từ nguồn gốc nguyên liệu',
]

export function emptySupplierLegal():SupplierLegal {
  return {applicability:'',coreRecords:[...defaultCoreRecords],documentNumber:'',issuer:'',issuedAt:'',expiresAt:'',reviewCycle:'Theo kỳ rà soát',updatedAt:'',attachments:[]}
}
const demoLegal = (scope:string):SupplierLegal => ({...emptySupplierLegal(),applicability:scope,updatedAt:'2026-10-12'})

export const supplierSeeds:Supplier[] = [
  {id:'supplier-demo-trace',code:'DEMO-TRACE-20261019-4a3ce246',name:'DEMO - Nhà cung cấp nguyên liệu',contact:'Nguyễn Minh An',phone:'090 100 2001',email:'demo.nguyenlieu@example.vn',address:'Phường Bình Hưng Hoà, TP.HCM',taxCode:'DEMO-031001001',note:'Nhà cung cấp minh họa cho chuỗi truy xuất.',debt:810000,totalPurchase:810000,status:'active',legal:demoLegal('Cung ứng nguyên liệu cho bếp trung tâm và bếp tại trường (DEMO)')},
  {id:'supplier-kido',code:'NCC000007',name:'Kido Hàng Hóa',contact:'Trần Thu Hà',phone:'090 100 2007',email:'hanghoa@example.vn',address:'Quận Tân Phú, TP.HCM',taxCode:'DEMO-031001007',note:'Dữ liệu minh họa.',debt:470000,totalPurchase:671800,status:'active',legal:demoLegal('Cung ứng hàng hóa và nguyên liệu theo hợp đồng (DEMO)')},
  {id:'supplier-farm',code:'NCC000008',name:'Nông trại Xanh',contact:'Lê Hoàng Nam',phone:'090 100 2008',email:'nongtraixanh@example.vn',address:'Đà Lạt, Lâm Đồng',taxCode:'DEMO-580100008',note:'Rau củ theo mùa.',debt:0,totalPurchase:1245000,status:'active',legal:demoLegal('Rau củ tươi theo mùa (DEMO)')},
  {id:'supplier-rice',code:'NCC000009',name:'HTX Nông nghiệp An Phú',contact:'Phạm Thanh Hương',phone:'090 100 2009',email:'htxanphu@example.vn',address:'Đồng bằng sông Cửu Long',taxCode:'DEMO-150100009',note:'Gạo và nông sản khô.',debt:0,totalPurchase:2130000,status:'active',legal:demoLegal('Gạo và nông sản khô (DEMO)')},
  {id:'supplier-meat',code:'NCC000010',name:'Thực phẩm An Tâm',contact:'Võ Đức Minh',phone:'090 100 2010',email:'antam@example.vn',address:'Huyện Hóc Môn, TP.HCM',taxCode:'DEMO-031001010',note:'Thực phẩm tươi sống DEMO.',debt:0,totalPurchase:1980000,status:'active',legal:demoLegal('Thịt và thực phẩm tươi sống (DEMO)')},
  {id:'supplier-water',code:'NCC000011',name:'Nước uống Học Đường',contact:'Đỗ Ngọc Mai',phone:'090 100 2011',email:'nuocuong@example.vn',address:'Quận Bình Tân, TP.HCM',taxCode:'DEMO-031001011',note:'Nước uống đóng chai.',debt:0,totalPurchase:540000,status:'inactive',legal:demoLegal('Nước uống đóng chai (DEMO)')},
]

const storageKey='demo-suppliers-v1'
const allowedMimes = new Set(['application/pdf','image/jpeg','image/png','image/webp'])
export function normalizeSupplier(item:Supplier):Supplier {
  const raw=item.legal
  const safeAttachments = Array.isArray(raw?.attachments) ? raw.attachments.filter(file=>
    file && typeof file.id==='string' && typeof file.filename==='string' &&
    allowedMimes.has(file.mimeType) && typeof file.dataUrl==='string' &&
    file.dataUrl.startsWith(`data:${file.mimeType};base64,`) &&
    Number.isFinite(file.size) && file.size>0 && file.size<=800*1024 &&
    supplierDocumentTypes.some(category=>category.id===file.type)
  ).map(file=>({...file,status:'unverified' as const})) : []
  return {...item,legal:{
    ...emptySupplierLegal(),
    ...(raw??{}),
    applicability:typeof raw?.applicability==='string'?raw.applicability:'',
    coreRecords:Array.isArray(raw?.coreRecords)?raw.coreRecords.filter(v=>typeof v==='string').slice(0,10):[...defaultCoreRecords],
    documentNumber:typeof raw?.documentNumber==='string'?raw.documentNumber:'',
    issuer:typeof raw?.issuer==='string'?raw.issuer:'',
    issuedAt:typeof raw?.issuedAt==='string'?raw.issuedAt:'',
    expiresAt:typeof raw?.expiresAt==='string'?raw.expiresAt:'',
    reviewCycle:typeof raw?.reviewCycle==='string'?raw.reviewCycle:'Theo kỳ rà soát',
    updatedAt:typeof raw?.updatedAt==='string'?raw.updatedAt:'',
    attachments:safeAttachments,
  }}
}
export function readSuppliers():Supplier[] {
  try {
    const parsed:unknown=JSON.parse(localStorage.getItem(storageKey)??'null')
    if(!Array.isArray(parsed))return supplierSeeds.map(normalizeSupplier)
    const valid=parsed.filter((item):item is Supplier=>typeof item==='object'&&item!==null&&typeof (item as Supplier).id==='string'&&typeof (item as Supplier).code==='string'&&typeof (item as Supplier).name==='string')
    return valid.map(normalizeSupplier) // [] là danh sách đã xóa hết, không khôi phục ngầm dữ liệu mẫu
  } catch {return supplierSeeds.map(normalizeSupplier)}
}
export function saveSuppliers(items:Supplier[]):void {localStorage.setItem(storageKey,JSON.stringify(items.map(normalizeSupplier)))}
