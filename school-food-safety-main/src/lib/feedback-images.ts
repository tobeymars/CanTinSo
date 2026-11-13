import type { FeedbackAttachment } from './data'

export const MAX_FEEDBACK_PHOTOS = 3
export const MAX_FEEDBACK_PHOTO_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.82
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không thể đọc ảnh.'))
    reader.onerror = () => reject(new Error('Không thể đọc ảnh.'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Không thể xử lý ảnh “${file.name}”.`))
    }
    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không thể tối ưu ảnh.')), 'image/jpeg', JPEG_QUALITY)
  })
}

export async function prepareFeedbackPhoto(file: File): Promise<FeedbackAttachment> {
  if (!allowedTypes.has(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
  if (file.size > MAX_FEEDBACK_PHOTO_BYTES) throw new Error(`Ảnh “${file.name}” vượt quá 5 MB.`)

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Thiết bị không hỗ trợ xử lý ảnh này.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const blob = await canvasToBlob(canvas)

  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    mimeType: 'image/jpeg',
    size: blob.size,
    dataUrl: await readAsDataUrl(blob),
  }
}
