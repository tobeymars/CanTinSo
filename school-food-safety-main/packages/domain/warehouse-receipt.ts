export const RECEIPT_KINDS = ['STOCK_GOODS', 'RAW_MATERIALS'] as const
export type ReceiptKind = typeof RECEIPT_KINDS[number]

export type ReceiptCatalogItem = {
  id:string
  category:string
  unit:string
  managesExpiry?:boolean
  managesSerial?:boolean
}

export type ReceiptUnit = { code:string; label:string; factor:number }

const stockGoodsCategories = new Set(['Ăn vặt','Học tập','Tiện ích','Đồ uống','Sữa','Snack'])

export function receiptKindLabel(kind:ReceiptKind) {
  return kind==='STOCK_GOODS'?'Nhập hàng từ nhà cung cấp':'Nhập nguyên, nhiên liệu'
}

export function receiptKindDescription(kind:ReceiptKind) {
  return kind==='STOCK_GOODS'
    ? 'Hàng đóng gói hoặc mặt hàng bán trực tiếp; chỉ hiển thị danh mục hàng hóa phù hợp.'
    : 'Nguyên liệu, thực phẩm và nhiên liệu dùng cho chế biến; ưu tiên quản lý lô và hạn dùng.'
}

export function acceptsReceiptKind(item:Pick<ReceiptCatalogItem,'category'>,kind:ReceiptKind) {
  return kind==='STOCK_GOODS'?stockGoodsCategories.has(item.category):!stockGoodsCategories.has(item.category)
}

/** Chỉ trả đơn vị có hệ số đã cấu hình; không tự suy đoán quy cách thùng/chai/hộp. */
export function configuredUnits(item:Pick<ReceiptCatalogItem,'id'|'unit'>):ReceiptUnit[] {
  if(item.unit==='kg') return [{code:'kg',label:'kg',factor:1},{code:'g',label:'g',factor:0.001}]
  if(item.unit==='lít') return [{code:'lít',label:'lít',factor:1}]
  if(item.id==='product-21') return [{code:'hộp',label:'hộp',factor:1},{code:'thùng-48',label:'thùng (48 hộp)',factor:48}]
  return [{code:item.unit,label:item.unit,factor:1}]
}

type Decimal = { value:bigint; scale:bigint }
function decimal(value:string):Decimal|null {
  const normalized=value.trim().replace(',','.')
  if(!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const [whole='0',fraction='']=normalized.split('.')
  return {value:BigInt(`${whole}${fraction}`),scale:10n**BigInt(fraction.length)}
}

/** Nhân số lượng thập phân với đơn giá VND, làm tròn nửa lên đến đồng. */
export function lineAmountVnd(quantity:string,unitPrice:string):number|null {
  const q=decimal(quantity);const price=decimal(unitPrice)
  if(!q||!price) return null
  const numerator=q.value*price.value;const denominator=q.scale*price.scale
  const rounded=(numerator+denominator/2n)/denominator
  const result=Number(rounded)
  return Number.isSafeInteger(result)?result:null
}

export function baseQuantity(quantity:string,factor:number):number|null {
  const parsed=Number(quantity)
  if(!Number.isFinite(parsed)||parsed<=0||!Number.isFinite(factor)||factor<=0) return null
  return Math.round(parsed*factor*1_000_000)/1_000_000
}

export type ExpiryShortcut = 'week'|'month'|'quarter'|'halfYear'

/** Date-only UTC để tránh lệch ngày theo timezone khi cộng tháng. */
export function expiryFrom(manufacturedAt:string,shortcut:ExpiryShortcut):string|null {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(manufacturedAt)) return null
  const [year,month,day]=manufacturedAt.split('-').map(Number)
  const date=new Date(Date.UTC(year!,month!-1,day!))
  if(Number.isNaN(date.valueOf())) return null
  if(shortcut==='week') date.setUTCDate(date.getUTCDate()+7)
  else date.setUTCMonth(date.getUTCMonth()+(shortcut==='month'?1:shortcut==='quarter'?3:6))
  return date.toISOString().slice(0,10)
}

export function parseSerials(value:string) {
  return value.split(/[\n,;]/).map(item=>item.trim()).filter(Boolean)
}

export function validateSerials(value:string,quantity:number) {
  const serials=parseSerials(value)
  if(new Set(serials.map(item=>item.toLocaleLowerCase('vi'))).size!==serials.length) return 'Danh sách serial có giá trị trùng.'
  if(!Number.isInteger(quantity)||serials.length!==quantity) return `Cần đúng ${quantity} serial cho số lượng đã nhập.`
  return null
}
