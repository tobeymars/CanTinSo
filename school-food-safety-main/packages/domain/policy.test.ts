import { describe,it,expect } from 'vitest'
import {assertTransition,canMonitorMeal,canViewUnconfirmedMealPhotos,canReadFeedback,canReadInventory,canRecordInventory,canRespond,canUpdateMealMenu} from './policy'
import type {Actor,Service} from './policy'
const board:Actor={id:'b',role:'school_board',schoolId:'s',kitchenId:null,wardId:'w'}
const kitchen:Actor={id:'k',role:'central_kitchen',schoolId:null,kitchenId:'k',wardId:'w'}
const receiver:Actor={id:'r',role:'school_receiver',schoolId:'s',kitchenId:null,wardId:'w'}
const server:Actor={id:'m',role:'meal_service_staff',schoolId:'s',kitchenId:null,wardId:'w'}
const schoolKitchen:Actor={id:'sk',role:'school_kitchen',schoolId:'s',kitchenId:'k',wardId:'w'}
const onsite:Service={id:'m',schoolId:'s',kitchenId:null,mode:'ON_SITE',status:'PREPARING',version:1}
describe('Meal state machine',()=>{
 it('rejects READY before PLATED',()=>expect(()=>assertTransition(onsite,'READY',board,['p'],1)).toThrow('INVALID_TRANSITION'))
 it('allows scoped meal-service staff to plate without a photo and mark ready with one',()=>{expect(()=>assertTransition(onsite,'PLATED',server,[],1)).not.toThrow();expect(()=>assertTransition({...onsite,status:'PLATED',version:2},'READY',server,['q'],2)).not.toThrow()})
 it('allows the assigned on-site kitchen to report plating without a photo',()=>{expect(()=>assertTransition(onsite,'PLATED',schoolKitchen,[],1)).not.toThrow();expect(()=>assertTransition(onsite,'PLATED',{...schoolKitchen,schoolId:'other'},[],1)).toThrow('FORBIDDEN')})
 it('requires a distinct photo only when the meal is ready',()=>{expect(()=>assertTransition(onsite,'PLATED',server,[],1)).not.toThrow();const plated={...onsite,status:'PLATED' as const,version:2};expect(()=>assertTransition(plated,'READY',server,[],2)).toThrow('PHOTOS_REQUIRED');expect(()=>assertTransition(plated,'READY',server,['p','p'],2)).toThrow('PHOTOS_REQUIRED')})
 it('blocks cross school and stale versions',()=>{expect(()=>assertTransition(onsite,'PLATED',{...server,schoolId:'other'},[],1)).toThrow('FORBIDDEN');expect(()=>assertTransition(onsite,'PLATED',server,[],0)).toThrow('VERSION_CONFLICT')})
 it('only assigned kitchen dispatches without a photo, kitchen cannot receive',()=>{const central:Service={...onsite,kitchenId:'k',mode:'CENTRAL_KITCHEN'};expect(()=>assertTransition(central,'DISPATCHED',kitchen,[],1)).not.toThrow();expect(()=>assertTransition(central,'DISPATCHED',{...kitchen,kitchenId:'other'},[],1)).toThrow('FORBIDDEN');expect(()=>assertTransition({...central,status:'DISPATCHED'},'ARRIVED',kitchen,[],1)).toThrow('FORBIDDEN')})
 it('separates dispatch, receiving, serving and board confirmation responsibilities',()=>{let s:Service={...onsite,kitchenId:'k',mode:'CENTRAL_KITCHEN'};for(const next of ['DISPATCHED','ARRIVED','PLATED','READY'] as const){const actor=next==='DISPATCHED'?kitchen:next==='ARRIVED'?receiver:server;assertTransition(s,next,actor,next==='READY'?['ready-photo']:[],s.version);expect(()=>assertTransition(s,next,board,next==='READY'?['ready-photo']:[],s.version)).toThrow('FORBIDDEN');s={...s,status:next,version:s.version+1}}})
})
describe('Feedback permissions',()=>{
 const record={parentId:'p',schoolId:'s',wardId:'w',kitchenId:'k'}
 it('parent cannot read another parent record',()=>{expect(canReadFeedback({...board,id:'other',role:'parent'},record)).toBe(false);expect(canReadFeedback({...board,id:'p',role:'parent'},record)).toBe(true)})
 it('kitchen sees related case but cannot respond',()=>{expect(canReadFeedback(kitchen,record)).toBe(true);expect(canRespond(kitchen,'s')).toBe(false)})
 it('board and ward access limited to scope',()=>{expect(canReadFeedback({...board,schoolId:'other'},record)).toBe(false);expect(canReadFeedback({...board,role:'culture_social_office',wardId:'other'},record)).toBe(false);expect(canRespond(board,'s')).toBe(true)})
})
describe('Inventory permissions',()=>{
 const record={schoolId:'s',wardId:'w',kitchenId:'k'}
 it('only scoped school board and ward can read stock balances',()=>{
  expect(canReadInventory(board,record)).toBe(true)
  expect(canReadInventory({...board,schoolId:'other'},record)).toBe(false)
  expect(canReadInventory({...board,role:'culture_social_office'},record)).toBe(true)
  expect(canReadInventory({...board,role:'culture_social_office',wardId:'other'},record)).toBe(false)
  expect(canReadInventory(kitchen,record)).toBe(false)
  expect(canReadInventory({...board,role:'parent'},record)).toBe(false)
 })
 it('only the assigned kitchen account can record receipts and issues',()=>{
  expect(canRecordInventory(kitchen,record)).toBe(true)
  expect(canRecordInventory(schoolKitchen,record)).toBe(true)
  expect(canRecordInventory({...kitchen,kitchenId:'other'},record)).toBe(false)
  expect(canRecordInventory(board,record)).toBe(false)
  expect(canRecordInventory({...board,role:'culture_social_office'},record)).toBe(false)
 })
})

describe('Meal monitoring permissions',()=>{
 const meal={schoolId:'s',wardId:'w'}
 it('lets Phòng VH-XH monitor only schools in its ward',()=>{
  expect(canMonitorMeal({...board,role:'culture_social_office'},meal)).toBe(true)
  expect(canMonitorMeal({...board,role:'culture_social_office',wardId:'other'},meal)).toBe(false)
  expect(canMonitorMeal(board,meal)).toBe(false)
 })
 it('keeps menu and portion updates with the scoped school board',()=>{
  expect(canUpdateMealMenu(board,meal)).toBe(true)
  expect(canUpdateMealMenu({...board,schoolId:'other'},meal)).toBe(false)
  expect(canUpdateMealMenu({...board,role:'culture_social_office'},meal)).toBe(false)
  expect(canUpdateMealMenu(kitchen,meal)).toBe(false)
 })
})

describe('Unconfirmed meal photo visibility',()=>{
 const scope={schoolId:'s',wardId:'w',kitchenId:'k'}
 const actor=(role:Actor['role'],ids:Partial<Actor>={}):Actor=>({id:role,role,schoolId:null,kitchenId:null,wardId:null,...ids})
 it('hides photos awaiting board confirmation from parents and unrelated roles',()=>{
  expect(canViewUnconfirmedMealPhotos(actor('parent',{schoolId:'s',wardId:'w'}),scope)).toBe(false)
  for(const role of ['supplier','inspector','system_admin'] as const) expect(canViewUnconfirmedMealPhotos(actor(role,{schoolId:'s',kitchenId:'k',wardId:'w'}),scope)).toBe(false)
 })
 it('shows them to school-side roles of the same school only',()=>{
  for(const role of ['school_board','school_receiver','meal_service_staff','school_kitchen'] as const){
   expect(canViewUnconfirmedMealPhotos(actor(role,{schoolId:'s'}),scope)).toBe(true)
   expect(canViewUnconfirmedMealPhotos(actor(role,{schoolId:'other'}),scope)).toBe(false)
  }
 })
 it('scopes the central kitchen by kitchen and Phòng VH-XH by ward',()=>{
  expect(canViewUnconfirmedMealPhotos(actor('central_kitchen',{kitchenId:'k'}),scope)).toBe(true)
  expect(canViewUnconfirmedMealPhotos(actor('central_kitchen',{kitchenId:'other'}),scope)).toBe(false)
  expect(canViewUnconfirmedMealPhotos(actor('central_kitchen',{kitchenId:'k'}),{...scope,kitchenId:null})).toBe(false)
  expect(canViewUnconfirmedMealPhotos(actor('culture_social_office',{wardId:'w'}),scope)).toBe(true)
  expect(canViewUnconfirmedMealPhotos(actor('culture_social_office',{wardId:'other'}),scope)).toBe(false)
 })
})
