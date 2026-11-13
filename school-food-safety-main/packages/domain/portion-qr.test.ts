import { describe, expect, it } from 'vitest'
import { activePortionQrs, assertCanIssuePortionQr, assertDishQrCoverage, canReadPortionQrRegistry, encodeOpaqueToken } from './portion-qr'
import type { Actor } from './policy'
import type { PortionQrEvent, PortionQrRecord, PortionQrScope } from './portion-qr'

const scope: PortionQrScope = {schoolId:'school-a',kitchenId:'kitchen-a',wardId:'ward-a',serviceMode:'CENTRAL_KITCHEN',serviceDate:'2026-10-18',mealType:'LUNCH'}
const kitchen: Actor = {id:'cook-a',role:'central_kitchen',schoolId:null,kitchenId:'kitchen-a',wardId:'ward-a'}
const records: PortionQrRecord[] = ['Cơm trắng','Canh rau'].map((dishName,index)=>({...scope,id:`qr-${index+1}`,publicToken:`opaque-token-${index+1}`,dishName,sequence:index+1,batchId:'batch-a',issuedAt:'2026-10-18T08:00:00+07:00',issuedBy:kitchen.id}))

describe('Dish QR policy', () => {
  it('only lets the assigned central kitchen issue labels', () => {
    expect(()=>assertCanIssuePortionQr(kitchen,scope,2)).not.toThrow()
    expect(()=>assertCanIssuePortionQr({...kitchen,kitchenId:'other'},scope,2)).toThrow('FORBIDDEN')
    expect(()=>assertCanIssuePortionQr(kitchen,{...scope,serviceMode:'ON_SITE'},2)).toThrow('CENTRAL_KITCHEN_ONLY')
  })

  it('requires one unique active QR for every dish', () => {
    expect(()=>assertDishQrCoverage(['Cơm trắng','Canh rau'],records)).not.toThrow()
    expect(()=>assertDishQrCoverage(['Cơm trắng','Canh rau','Trái cây'],records)).toThrow('QR_DISH_COVERAGE_MISMATCH')
    expect(()=>assertDishQrCoverage(['Cơm trắng','Canh rau'],[records[0]!,{...records[1]!,publicToken:records[0]!.publicToken}])).toThrow('DUPLICATE_QR_TOKEN')
  })

  it('keeps revocation as an append-only event', () => {
    const events: PortionQrEvent[] = [{id:'event-1',portionQrId:'qr-1',type:'REVOKED',reason:'Nhãn in lỗi',recordedAt:'2026-10-18T08:10:00+07:00',actorId:kitchen.id}]
    expect(activePortionQrs(records,events).map(record=>record.id)).toEqual(['qr-2'])
  })

  it('limits registry reads to the assigned kitchen, school or ward', () => {
    expect(canReadPortionQrRegistry(kitchen,scope)).toBe(true)
    expect(canReadPortionQrRegistry({...kitchen,role:'school_board',schoolId:'school-a'},scope)).toBe(true)
    expect(canReadPortionQrRegistry({...kitchen,role:'culture_social_office',wardId:'ward-a'},scope)).toBe(true)
    expect(canReadPortionQrRegistry({...kitchen,role:'parent'},scope)).toBe(false)
  })

  it('creates URL-safe opaque tokens with at least 128 bits of input entropy', () => {
    expect(encodeOpaqueToken(new Uint8Array(18).fill(255))).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(()=>encodeOpaqueToken(new Uint8Array(15))).toThrow('TOKEN_ENTROPY_TOO_LOW')
  })
})
