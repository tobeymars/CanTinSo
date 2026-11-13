/**
 * Cấu hình phân hệ kho DEMO: nơi duy nhất giữ ngưỡng cảnh báo sắp hết hạn.
 * Chưa có cấu hình hệ thống từ backend nên dùng giá trị mặc định, cho phép ghi đè bằng khóa `demo-warehouse-settings` trên trình duyệt.
 */
export const DEFAULT_EXPIRY_WARNING_DAYS=7
const storageKey='demo-warehouse-settings'

export function expiryWarningDays():number {
  try{
    const parsed:unknown=JSON.parse(localStorage.getItem(storageKey)??'null')
    const value=parsed&&typeof parsed==='object'?(parsed as {expiryWarningDays?:unknown}).expiryWarningDays:undefined
    return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=365?value:DEFAULT_EXPIRY_WARNING_DAYS
  }catch{return DEFAULT_EXPIRY_WARNING_DAYS}
}

/** Ngày hiện tại theo giờ máy, dạng YYYY-MM-DD. */
export const localToday=()=>new Date().toLocaleDateString('sv-SE')
