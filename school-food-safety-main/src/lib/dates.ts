/** Tiện ích ngày theo `vi-VN`; neo 12:00 giờ địa phương để tránh lệch ngày do múi giờ. */
export const weekDates = (date: string) => Array.from({length:7},(_,i)=>{const d=new Date(`${date}T12:00:00`);const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1)+i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
export const shiftDate = (date: string, days: number) => {const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export const compactDateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})
export const weekdayLabel = (date: string) => {
  const label=new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{weekday:'long'})
  return label.charAt(0).toLocaleUpperCase('vi-VN')+label.slice(1)
}
