import { describe, expect, it } from 'vitest'
import { calculateTransportMinutes } from '../src/lib/transportMetrics'

describe('transportation duration from saved school delivery stages', () => {
  it('calculates minutes for a confirmed dispatch and arrival', () => {
    expect(calculateTransportMinutes('2026-11-26', '09:15', '09:38', true, true)).toBe(23)
  })
  it('keeps duration unavailable until both stages are confirmed', () => {
    expect(calculateTransportMinutes('2026-11-26', '09:15', '09:38', true, false)).toBeNull()
    expect(calculateTransportMinutes('2026-11-26', '09:15', undefined, true, true)).toBeNull()
  })
  it('never turns invalid or reversed times into misleading travel durations', () => {
    expect(calculateTransportMinutes('2026-11-26', '10:15', '09:38', true, true)).toBeNull()
    expect(calculateTransportMinutes('2026-11-26', '99:00', '09:38', true, true)).toBeNull()
  })
  it('supports zero-minute reporting without treating zero as missing', () => {
    expect(calculateTransportMinutes('2026-11-26', '09:15', '09:15', true, true)).toBe(0)
  })
})
