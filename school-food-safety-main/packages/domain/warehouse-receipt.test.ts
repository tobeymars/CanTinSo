import { describe,expect,it } from 'vitest'
import { acceptsReceiptKind,baseQuantity,expiryFrom,lineAmountVnd,validateSerials } from './warehouse-receipt'

describe('warehouse receipt domain',()=>{
  it('filters catalog by stable receipt kind',()=>{
    expect(acceptsReceiptKind({category:'Sữa'},'STOCK_GOODS')).toBe(true)
    expect(acceptsReceiptKind({category:'Sữa'},'RAW_MATERIALS')).toBe(false)
    expect(acceptsReceiptKind({category:'Nguyên liệu, vật liệu'},'RAW_MATERIALS')).toBe(true)
  })
  it('calculates VND without binary floating point drift',()=>{
    expect(lineAmountVnd('2','100000')).toBe(200000)
    expect(lineAmountVnd('0.3','10000')).toBe(3000)
    expect(lineAmountVnd('0','10000')).toBe(0)
    expect(lineAmountVnd('x','10000')).toBeNull()
  })
  it('converts only with a supplied positive factor',()=>{
    expect(baseQuantity('2',1000)).toBe(2000)
    expect(baseQuantity('2',0)).toBeNull()
  })
  it('calculates expiry shortcuts from the manufacturing date',()=>{
    expect(expiryFrom('2026-10-27','week')).toBe('2026-11-03')
    expect(expiryFrom('2026-10-27','quarter')).toBe('2027-01-27')
  })
  it('rejects duplicate or mismatched serials',()=>{
    expect(validateSerials('A\nB',2)).toBeNull()
    expect(validateSerials('A\na',2)).toMatch(/trùng/)
    expect(validateSerials('A',2)).toMatch(/đúng 2/)
  })
})
