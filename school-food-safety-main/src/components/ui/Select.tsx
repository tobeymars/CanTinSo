import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import './Select.css'

/**
 * Select dùng chung, phỏng theo React Bits "Glide Select" (https://reactbits.dev/micro/glide-select, MIT + Commons Clause,
 * xem src/components/react-bits/LICENSE.md): menu bật ra từ góc, vệt sáng trượt giữa các dòng, nhấn giữ–kéo–thả để chọn.
 * Khác bản gốc: menu đặt trong top layer (Popover API) để không bị cắt trong bảng/khung cuộn, dùng token màu của ứng dụng,
 * hỗ trợ mô tả/tag, mục bị vô hiệu, gõ nhiều ký tự để tìm, và một <select> gốc ẩn cho FormData/required.
 */
export type SelectOption = { value: string; label: string; description?: string; tag?: string; disabled?: boolean }
type Props = {
  /** Tên truy cập của ô chọn (aria-label). */
  label: string
  value?: string
  defaultValue?: string
  /** Danh sách lựa chọn; có thể thay bằng các phần tử <option> con như <select> gốc. */
  options?: SelectOption[]
  children?: ReactNode
  onValueChange?: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  id?: string
  variant?: 'default' | 'hero'
  size?: 'md' | 'sm'
  className?: string
  /** Hiển thị ô tìm ngay trong menu và lọc theo nhãn, mô tả, tag. */
  searchable?: boolean
  searchPlaceholder?: string
}
type Phase = 'closed' | 'open' | 'closing'

/** Phải khớp thời lượng đóng menu trong Select.css (--glide-pop-out). */
const POP_OUT_MS = 120

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}
/** Đọc các <option> con (kể cả trong mảng/fragment) theo đúng ngữ nghĩa của <select> gốc. */
function optionsFrom(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child): SelectOption[] => {
    if (!isValidElement(child)) return []
    const element = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>
    if (element.type === Fragment) return optionsFrom(element.props.children)
    if (element.type !== 'option') return []
    const label = textOf(element.props.children)
    return [{ value: element.props.value === undefined ? label : String(element.props.value), label, disabled: !!element.props.disabled }]
  })
}

const normalizedText = (value: string) => value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')

export default function Select({ label, value, defaultValue, options: optionList, children, onValueChange, onBlur, placeholder = 'Chọn một mục', disabled = false, required = false, invalid = false, name, id, variant = 'default', size = 'md', className = '', searchable = false, searchPlaceholder = 'Tìm kiếm…' }: Props) {
  const options = optionList ?? optionsFrom(children)
  const [inner, setInner] = useState(() => defaultValue ?? options.find(option => !option.disabled)?.value ?? '')
  const current = value ?? inner
  const selectedIndex = options.findIndex(option => option.value === current)
  const selected = options[selectedIndex]
  const uid = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [active, setActive] = useState<number | null>(null)
  const [position, setPosition] = useState<CSSProperties>({})
  const [missing, setMissing] = useState(false)
  const [query, setQuery] = useState('')
  const typed = useRef('')
  const typedAt = useRef(0)
  const scrub = useRef<number | null>(null)
  const jump = useRef(true)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype
  // Bị vô hiệu khi đang mở thì coi như đã đóng.
  const shownPhase: Phase = disabled ? 'closed' : phase
  const isOpen = shownPhase === 'open'
  const normalizedQuery = normalizedText(query.trim())
  const visibleOptions = options.map((option, index) => ({ option, index })).filter(({ option }) => !normalizedQuery
    || normalizedText([option.label, option.description, option.tag].filter(Boolean).join(' ')).includes(normalizedQuery))
  const enabled = visibleOptions.map(({ option, index }) => option.disabled ? -1 : index).filter(index => index >= 0)

  const commit = (next: string) => {
    if (next === current) return
    if (value === undefined) setInner(next)
    setMissing(false)
    onValueChange?.(next)
    const node = labelRef.current
    if (node) { node.classList.remove('is-swapping'); void node.offsetWidth; node.classList.add('is-swapping') }
  }
  const close = (mode: 'instant' | 'pop', restoreFocus = false) => {
    clearTimeout(closeTimer.current)
    setActive(null)
    scrub.current = null
    setQuery('')
    if (mode === 'instant' || !panel.current) setPhase('closed')
    else { panel.current.dataset.state = 'closed'; setPhase('closing'); closeTimer.current = setTimeout(() => setPhase('closed'), POP_OUT_MS + 20) }
    if (restoreFocus) trigger.current?.focus({ preventScroll: true })
  }
  const open = (start?: number) => {
    if (disabled || !enabled.length) return
    clearTimeout(closeTimer.current)
    jump.current = true
    setActive(start ?? (selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : enabled[0]!))
    setPhase('open')
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    commit(option.value)
    close('instant', true)
  }

  // Định vị trong top layer, lật lên trên khi thiếu chỗ, rồi chạy hiệu ứng bật ra từ góc.
  useLayoutEffect(() => {
    if (!isOpen || !panel.current || !trigger.current) return
    const popup = panel.current
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, variant === 'hero' ? 300 : size === 'sm' ? 200 : 240), window.innerWidth - 24)
      const below = window.innerHeight - rect.bottom - 18
      const above = rect.top - 18
      const height = Math.min(popup.scrollHeight, 340)
      const flip = below < Math.min(height, 180) && above > below
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
      popup.dataset.side = flip ? 'top' : 'bottom'
      setPosition({ left, top: flip ? undefined : rect.bottom + 6, bottom: flip ? window.innerHeight - rect.top + 6 : undefined, width, maxHeight: Math.max(96, Math.min(340, flip ? above : below)), transformOrigin: `${flip ? 'bottom' : 'top'} ${rect.left - left + 16}px` })
    }
    if (supportsPopover && !popup.matches(':popover-open')) popup.showPopover()
    place()
    popup.dataset.state = 'closed'
    void popup.offsetHeight
    popup.dataset.state = 'open'
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [isOpen, supportsPopover, variant, size])

  useEffect(() => {
    if (isOpen && searchable) requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }))
  }, [isOpen, searchable])

  // Vệt sáng trượt tới dòng đang trỏ; lần đầu mở thì đặt thẳng vào vị trí, không trượt.
  useLayoutEffect(() => {
    const highlight = pill.current
    if (!highlight || !isOpen) return
    const row = active === null ? null : list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (!row) { highlight.style.opacity = '0'; return }
    highlight.style.transitionDuration = jump.current || highlight.style.opacity !== '1' ? '0ms' : ''
    highlight.style.transform = `translateY(${row.offsetTop}px)`
    highlight.style.height = `${row.offsetHeight}px`
    highlight.style.opacity = '1'
    jump.current = false
    row.scrollIntoView({ block: 'nearest' })
  }, [active, isOpen])

  useEffect(() => {
    if (shownPhase === 'closed') return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) close('pop') }
    document.addEventListener('pointerdown', outside, true)
    return () => document.removeEventListener('pointerdown', outside, true)
  })
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') { if (phase !== 'closed') close('instant'); return }
    if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); close('pop', true); return }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (isOpen && active !== null) choose(active); else open(); return }
    if (!enabled.length) return
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const edge = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)! : null
      if (!isOpen) { open(edge ?? undefined); return }
      jump.current = false
      const from = enabled.indexOf(active ?? enabled[0]!)
      setActive(edge ?? enabled[(from + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]!)
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = event.timeStamp
      typed.current = now - typedAt.current > 650 ? event.key : typed.current + event.key
      typedAt.current = now
      const match = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase('vi').startsWith(typed.current.toLocaleLowerCase('vi')))
      if (match >= 0) { if (isOpen) setActive(match); else open(match) }
    }
  }
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close('pop', true); return }
    if (!enabled.length) return
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      jump.current = false
      const edge = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)! : null
      const from = enabled.indexOf(active ?? enabled[0]!)
      setActive(edge ?? enabled[(from + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]!)
      return
    }
    if (event.key === 'Enter' && active !== null) { event.preventDefault(); choose(active) }
  }
  const rowAt = (clientY: number) => {
    const rows = list.current?.querySelectorAll<HTMLElement>('[data-index]') ?? []
    for (const row of rows) { const rect = row.getBoundingClientRect(); if (clientY >= rect.top && clientY < rect.bottom) { const index = Number(row.dataset.index); return options[index]?.disabled ? null : index } }
    return null
  }
  // Chuột/bút: nhấn giữ rồi kéo qua các dòng, thả để chọn (như Glide Select). Cảm ứng: chạm để chọn, vẫn cuộn được danh sách dài.
  const onListDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.pointerType === 'touch') return
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* trình duyệt không hỗ trợ capture */ }
    scrub.current = event.pointerId
    setActive(rowAt(event.clientY))
  }
  const onListMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return
    const index = rowAt(event.clientY)
    if (index !== null && index !== active) setActive(index)
  }
  const onListUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrub.current !== event.pointerId) return
    scrub.current = null
    const index = rowAt(event.clientY)
    if (index !== null) choose(index)
  }

  const nativeMirror = <select className="glide-native" aria-hidden="true" tabIndex={-1} name={name} required={required} disabled={disabled} value={current} onChange={event => commit(event.target.value)} onInvalid={event => { event.preventDefault(); setMissing(true); trigger.current?.focus({ preventScroll: true }) }}>
    {selectedIndex < 0 && <option value="">{placeholder}</option>}
    {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </select>
  const classes = `apple-select glide-select ${variant} size-${size} ${className}`.trim()

  if (!supportsPopover) return <div className={`${classes} native-fallback`}>
    <select aria-label={label} id={id} name={name} required={required} value={current} disabled={disabled} onBlur={onBlur} onChange={event => commit(event.target.value)}>
      {selectedIndex < 0 && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select><ChevronDown size={16}/>
  </div>

  return <div ref={root} className={classes} data-invalid={invalid || missing ? '' : undefined}>
    <button ref={trigger} id={id} className="apple-select-trigger glide-select-trigger" type="button" role="combobox" aria-label={label} aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={`${uid}-options`} aria-activedescendant={isOpen && active !== null ? `${uid}-option-${active}` : undefined} aria-invalid={invalid || missing || undefined} aria-required={required || undefined} disabled={disabled || !options.length}
      onKeyDown={onKeyDown}
      onBlur={event => { onBlur?.(); if (!root.current?.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) { if (phase !== 'closed') close('pop') } }}
      onClick={() => isOpen ? close('pop') : open()}>
      <span ref={labelRef} className="glide-select-label" data-empty={selected ? undefined : ''} onAnimationEnd={event => event.currentTarget.classList.remove('is-swapping')}>{selected?.label ?? placeholder}</span>
      <ChevronDown size={size === 'sm' ? 15 : 16} className="glide-select-chevron" aria-hidden="true"/>
    </button>
    {(name !== undefined || required) && nativeMirror}
    {missing && <span className="glide-select-error" role="alert">Vui lòng chọn {label.toLocaleLowerCase('vi')}.</span>}
    {shownPhase !== 'closed' && <div ref={panel} popover="manual" className="apple-select-menu glide-select-menu" data-state="open" style={position} onPointerDown={event => { if (!(event.target instanceof HTMLInputElement)) event.preventDefault() }}>
      {searchable && <label className="glide-select-search"><Search size={15}/><span className="sr-only">Tìm trong {label}</span><input ref={searchInput} type="search" aria-label={`Tìm trong ${label}`} value={query} placeholder={searchPlaceholder} autoComplete="off" onChange={event => { setQuery(event.target.value); jump.current = true; const next = options.findIndex(option => !option.disabled && normalizedText([option.label, option.description, option.tag].filter(Boolean).join(' ')).includes(normalizedText(event.target.value.trim()))); setActive(next >= 0 ? next : null) }} onKeyDown={onSearchKeyDown}/></label>}
      <div ref={list} role="listbox" id={`${uid}-options`} aria-label={label} className="glide-select-list" data-live={active !== null ? '' : undefined}
        onPointerDown={onListDown} onPointerMove={onListMove} onPointerUp={onListUp} onPointerCancel={() => { scrub.current = null }}>
        <span ref={pill} className="glide-select-pill" aria-hidden="true"/>
        {visibleOptions.map(({ option, index }) => <div role="option" aria-selected={index === selectedIndex} aria-disabled={option.disabled || undefined} id={`${uid}-option-${index}`} data-index={index} data-value={option.value} key={`${option.value}-${index}`} className={`apple-select-option glide-select-option ${active === index ? 'is-active' : ''} ${option.disabled ? 'is-disabled' : ''}`}
          onClick={event => { if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType !== 'touch' && event.nativeEvent.pointerType !== '') return; choose(index) }}>
          <span className="glide-select-text"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          {option.tag && <span className="glide-select-tag">{option.tag}</span>}
          <span className="select-check" data-on={index === selectedIndex ? '' : undefined} aria-hidden="true"><Check size={size === 'sm' ? 15 : 17} strokeWidth={2.4}/></span>
        </div>)}
        {visibleOptions.length === 0 && <p className="glide-select-empty">Không tìm thấy kết quả phù hợp.</p>}
      </div>
    </div>}
  </div>
}
