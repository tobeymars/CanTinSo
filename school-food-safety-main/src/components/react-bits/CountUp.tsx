import { useCallback, useEffect, useRef, type CSSProperties } from 'react'

interface CountUpProps {
  to: number
  from?: number
  direction?: 'up' | 'down'
  delay?: number
  duration?: number
  className?: string
  style?: CSSProperties
  startWhen?: boolean
  separator?: string
  prefix?: string
  suffix?: string
  decimals?: number
  format?: 'standard' | 'compact'
  trigger?: 'view' | 'load'
  replayOnHover?: boolean
  onStart?: () => void
  onEnd?: () => void
}

const compactUnits: Array<[number, string]> = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3)

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  style,
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  decimals,
  format = 'standard',
  trigger = 'view',
  replayOnHover = false,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const frameRef = useRef(0)
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startValue = direction === 'down' ? to : from
  const endValue = direction === 'down' ? from : to

  const formatValue = useCallback((value: number) => {
    const unit = format === 'compact' ? compactUnits.find(([size]) => Math.abs(value) >= size) : undefined
    const divisor = unit?.[0] ?? 1
    const label = unit?.[1] ?? ''
    const precision = decimals ?? (unit && Math.abs(value) / divisor < 100 ? 1 : Math.max(0, `${to}`.split('.')[1]?.length ?? 0))
    const fixed = (value / divisor).toFixed(precision)
    const [integer, fraction] = fixed.split('.')
    const grouped = separator ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : integer
    return `${prefix}${grouped}${fraction ? `.${fraction}` : ''}${label}${suffix}`
  }, [decimals, format, prefix, separator, suffix, to])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    if (delayRef.current) clearTimeout(delayRef.current)
  }, [])

  const play = useCallback(() => {
    const element = ref.current
    if (!element || !startWhen) return
    stop()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || duration <= 0) {
      element.textContent = formatValue(endValue)
      onStart?.()
      onEnd?.()
      return
    }
    delayRef.current = setTimeout(() => {
      const startedAt = performance.now()
      onStart?.()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / (duration * 1000))
        element.textContent = formatValue(startValue + (endValue - startValue) * easeOut(progress))
        if (progress < 1) frameRef.current = requestAnimationFrame(tick)
        else onEnd?.()
      }
      frameRef.current = requestAnimationFrame(tick)
    }, Math.max(0, delay) * 1000)
  }, [delay, duration, endValue, formatValue, onEnd, onStart, startValue, startWhen, stop])

  useEffect(() => {
    const element = ref.current
    if (!element || !startWhen) return undefined
    element.textContent = formatValue(startValue)
    if (trigger === 'load' || !('IntersectionObserver' in window)) {
      play()
      return stop
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        play()
      }
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [formatValue, play, startValue, startWhen, stop, trigger])

  return <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }} onPointerEnter={replayOnHover ? play : undefined}>{formatValue(startValue)}</span>
}
