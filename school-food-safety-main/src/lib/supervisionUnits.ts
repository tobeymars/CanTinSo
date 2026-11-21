/**
 * Units offered for meal-receipt evidence. Inventory remains stored in the original lot unit.
 * Never convert between mass, volume, or count without a verified density/package factor.
 */
export function receiptUnitOptions(baseUnit: string): string[] {
  const unit = baseUnit.trim().toLowerCase()
  if (unit === 'g' || unit === 'kg') return ['g', 'kg']
  if (unit === 'mg') return ['mg', 'g', 'kg']
  if (unit === 'ml' || unit === 'l' || unit === 'lít' || unit === 'lit') return ['ml', 'lít']
  return [baseUnit]
}

function baseFactor(unit: string): number | null {
  const key = unit.trim().toLowerCase()
  if (key === 'mg') return 0.001
  if (key === 'g') return 1
  if (key === 'kg') return 1000
  if (key === 'ml') return 1
  if (key === 'l' || key === 'lít' || key === 'lit') return 1000
  return null
}

function group(unit: string): 'mass' | 'volume' | null {
  const key = unit.trim().toLowerCase()
  if (['mg', 'g', 'kg'].includes(key)) return 'mass'
  if (['ml', 'l', 'lít', 'lit'].includes(key)) return 'volume'
  return null
}

export function convertReceiptQuantity(quantity: number, from: string, to: string): number | null {
  if (!Number.isFinite(quantity) || quantity < 0) return null
  if (from === to) return quantity
  if (!group(from) || group(from) !== group(to)) return null
  const a = baseFactor(from), b = baseFactor(to)
  if (a === null || b === null) return null
  return Number((quantity * a / b).toPrecision(12))
}

export const formatReceiptQuantity = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 6 })

/** Human-friendly suggestion for warehouse and meal checks; never changes stored lot unit. */
export function preferredReceiptUnit(baseUnit: string, availableCanonical?: number): string {
  const key=baseUnit.trim().toLowerCase()
  if(key==='g' && (availableCanonical===undefined || availableCanonical>=1000))return 'kg'
  if(key==='ml' && (availableCanonical===undefined || availableCanonical>=1000))return 'lít'
  return baseUnit
}
