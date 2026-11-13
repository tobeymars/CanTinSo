/** Ảnh minh họa vector đi kèm bản DEMO; không phải ảnh món ăn thực tế. */
import rice from '../assets/dishes/rice.svg'
import porridge from '../assets/dishes/porridge.svg'
import noodles from '../assets/dishes/noodles.svg'
import chicken from '../assets/dishes/chicken.svg'
import fish from '../assets/dishes/fish.svg'
import vegetables from '../assets/dishes/vegetables.svg'
import fruit from '../assets/dishes/fruit.svg'
import milk from '../assets/dishes/milk.svg'
import soup from '../assets/dishes/soup.svg'
import protein from '../assets/dishes/protein.svg'
import chickenNoodlesDemo from '../assets/dishes/chicken-noodles-demo.webp'
import type { BoardingMealType } from './boardingMenu'

export function dishIllustration(name: string, mealType: BoardingMealType): string {
  const normalized = name.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  if (normalized === 'mi xao ga') return chickenNoodlesDemo
  if (/chao/.test(normalized)) return porridge
  if (/bun|mi |my |pho|hu tieu/.test(normalized)) return noodles
  if (/ca |ca$|tom|muc/.test(normalized)) return fish
  if (/ga |ga$|vit/.test(normalized)) return chicken
  if (/canh|sup|soup/.test(normalized)) return soup
  if (/rau|bong cai|bi do/.test(normalized)) return vegetables
  if (/sua|banh/.test(normalized)) return milk
  if (/trai cay|thanh long|chuoi|dua hau|tao|cam |quyt/.test(normalized)) return fruit
  if (/thit|bo |heo|suon|trung/.test(normalized)) return protein
  return mealType === 'BREAKFAST' ? porridge : mealType === 'SNACK' ? fruit : rice
}

export function dishImage(name: string, mealType: BoardingMealType, uploaded?: string): string {
  return uploaded?.startsWith('data:image/jpeg;base64,') ? uploaded : dishIllustration(name, mealType)
}

/** Ảnh BGH tải lên được nén, giới hạn để tránh tràn localStorage của bản DEMO. */
export async function compressDishPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Dung lượng ảnh gốc không được vượt quá 5 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'))
      image.src = url
    })
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Thiết bị không hỗ trợ xử lý ảnh.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', .68)
    if (data.length > 350_000) throw new Error('Ảnh sau nén vẫn quá lớn. Hãy chọn ảnh nhẹ hơn.')
    return data
  } finally {
    URL.revokeObjectURL(url)
  }
}
