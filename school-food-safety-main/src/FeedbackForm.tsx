import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ImagePlus, School as SchoolIcon, Send, ShieldCheck, X } from 'lucide-react'
import { z } from 'zod'
import Select from './components/ui/Select'
import { demo, demoData } from './lib/data'
import type { Feedback, FeedbackAttachment, School } from './lib/data'
import { MAX_FEEDBACK_PHOTOS, prepareFeedbackPhoto } from './lib/feedback-images'

const feedbackSchema = z.object({
  kind: z.enum(['MENU_SUGGESTION', 'MEAL_QUALITY_REPORT']),
  content: z.string().trim().min(10, 'Vui lòng nhập ít nhất 10 ký tự.').max(3000, 'Tối đa 3.000 ký tự.'),
})

type FeedbackInput = z.infer<typeof feedbackSchema>

function FeedbackDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog aria-label={title} ref={ref} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={close}><X /></button></div>
      {children}
    </dialog>
  )
}

export default function FeedbackForm({ school, kind, close }: { school: School; kind: string; close: () => void }) {
  const cache = useQueryClient()
  const [result, setResult] = useState<Feedback | null>(null)
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([])
  const [photoError, setPhotoError] = useState('')
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false)
  const { register, control, handleSubmit, formState: { errors } } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { kind: kind === 'MENU_SUGGESTION' ? 'MENU_SUGGESTION' : 'MEAL_QUALITY_REPORT', content: '' },
  })
  const send = useMutation({
    mutationFn: (values: FeedbackInput) => demoData.sendFeedback({ ...values, schoolId: school.id, attachments }),
    onSuccess: item => {
      setResult(item)
      void cache.invalidateQueries({ queryKey: ['feedback'] })
    },
  })

  const addPhotos = async (files: FileList | null) => {
    setPhotoError('')
    if (!files?.length) return
    const selected = Array.from(files)
    if (attachments.length + selected.length > MAX_FEEDBACK_PHOTOS) {
      setPhotoError(`Bạn có thể đính kèm tối đa ${MAX_FEEDBACK_PHOTOS} ảnh.`)
      return
    }
    setIsPreparingPhotos(true)
    try {
      const prepared = await Promise.all(selected.map(prepareFeedbackPhoto))
      setAttachments(current => [...current, ...prepared])
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Không thể xử lý ảnh đã chọn.')
    } finally {
      setIsPreparingPhotos(false)
    }
  }

  const title = result ? 'Đã ghi nhận ý kiến của bạn' : 'Cùng xây dựng bữa ăn tốt hơn'
  return (
    <FeedbackDialog title={title} close={close}>
      {result ? (
        <div className="success-state">
          <span className="success-icon"><Check /></span>
          <p>{demo ? 'Đã lưu vào trình duyệt DEMO, chưa gửi đến nhà trường.' : 'Nhà trường đã tiếp nhận hồ sơ của bạn.'}</p>
          <div className="case-code">{result.id}</div>
          <p className="muted">Bạn có thể xem lại tại Phản ánh & góp ý.</p>
          <button className="primary" onClick={close}>Hoàn tất</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(values => send.mutate(values))}>
          <p className="form-context"><SchoolIcon size={17} />{school.name}</p>
          <div className="select-field">
            <span>Loại ý kiến</span>
            <Controller control={control} name="kind" render={({ field }) => (
              <Select label="Loại ý kiến" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={[
                { value: 'MEAL_QUALITY_REPORT', label: 'Phản ánh chất lượng bữa ăn' },
                { value: 'MENU_SUGGESTION', label: 'Góp ý thực đơn' },
              ]} />
            )} />
          </div>
          <label>Nội dung<textarea rows={5} placeholder="Chia sẻ cụ thể để nhà trường có thể hỗ trợ bạn…" {...register('content')} /></label>
          {errors.content && <p className="error">{errors.content.message}</p>}
          <fieldset className="feedback-photo-field">
            <legend>Hình ảnh đính kèm <span>Không bắt buộc</span></legend>
            <p>Thêm tối đa 3 ảnh JPG, PNG hoặc WebP; mỗi ảnh không quá 5 MB.</p>
            {attachments.length > 0 && <div className="feedback-photo-grid" aria-label="Ảnh đã chọn">{attachments.map((photo, index) => (
              <figure key={photo.id}><img src={photo.dataUrl} alt={`Ảnh đính kèm ${index + 1}: ${photo.name}`} /><button type="button" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => setAttachments(current => current.filter(item => item.id !== photo.id))}><X size={15} /></button></figure>
            ))}</div>}
            <label className={`feedback-photo-picker ${attachments.length >= MAX_FEEDBACK_PHOTOS ? 'disabled' : ''}`}>
              <ImagePlus size={20} />
              <span>{isPreparingPhotos ? 'Đang xử lý ảnh…' : attachments.length ? 'Thêm ảnh khác' : 'Chọn ảnh từ thiết bị'}</span>
              <input aria-label="Thêm ảnh đính kèm" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={isPreparingPhotos || attachments.length >= MAX_FEEDBACK_PHOTOS} onChange={event => { void addPhotos(event.target.files); event.target.value = '' }} />
            </label>
            {photoError && <p className="error" role="alert">{photoError}</p>}
          </fieldset>
          <div className="privacy"><ShieldCheck size={18} /><p>Ý kiến và ảnh được tiếp nhận riêng tư. Không gửi ảnh có thông tin cá nhân của học sinh nếu không cần thiết.</p></div>
          {demo && <p className="demo-note">DEMO · Hồ sơ và ảnh chỉ lưu trên trình duyệt này, không tải lên máy chủ hoặc gửi thông báo thật.</p>}
          {send.error && <p role="alert" className="error">{send.error.message}</p>}
          <button className="primary full" disabled={send.isPending || isPreparingPhotos}><Send size={16} />{send.isPending ? 'Đang gửi…' : isPreparingPhotos ? 'Đang xử lý ảnh…' : 'Gửi ý kiến'}</button>
        </form>
      )}
    </FeedbackDialog>
  )
}
