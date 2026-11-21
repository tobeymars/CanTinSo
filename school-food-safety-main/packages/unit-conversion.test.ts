import { describe, expect, it } from 'vitest'
import { convertReceiptQuantity, preferredReceiptUnit, readableStockQuantity, receiptUnitOptions } from '../src/lib/supervisionUnits'

describe('inventory unit conversion',()=>{
  it('converts g and kg without confusing 5 kg for 5 g',()=>{
    expect(convertReceiptQuantity(5,'kg','g')).toBe(5000)
    expect(convertReceiptQuantity(500,'g','kg')).toBe(0.5)
    expect(preferredReceiptUnit('g',5000)).toBe('kg')
    expect(preferredReceiptUnit('g',5)).toBe('g')
    expect(readableStockQuantity(5000,'g')).toBe('5 kg')
  })
  it('converts volume but not mass into volume',()=>{
    expect(convertReceiptQuantity(1.5,'lít','ml')).toBe(1500)
    expect(convertReceiptQuantity(250,'ml','lít')).toBe(0.25)
    expect(convertReceiptQuantity(1,'kg','lít')).toBeNull()
  })
  it('does not assume packaging conversion',()=>{
    expect(receiptUnitOptions('chai')).toEqual(['chai'])
    expect(convertReceiptQuantity(1,'chai','kg')).toBeNull()
  })
  it('remembers price per selected purchase unit when quantities change',()=>{
    const oldQty=2,oldUnit='kg',oldPrice=100000
    const newQty=convertReceiptQuantity(oldQty,oldUnit,'g')!
    const newPrice=oldPrice/convertReceiptQuantity(1,oldUnit,'g')!
    expect(newQty*newPrice).toBe(oldQty*oldPrice)
    expect(newQty).toBe(2000)
    expect(newPrice).toBe(100)
  })
})
