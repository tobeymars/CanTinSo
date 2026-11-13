import { create } from 'zustand'
export type ViewRole = 'parent'|'school_board'|'central_kitchen'|'school_receiver'|'meal_service_staff'|'school_kitchen'|'culture_social_office'
/** Năm không gian làm việc được phép lựa chọn trong bản DEMO.
 * Các type legacy vẫn còn để tương thích các module cũ, nhưng không còn được chọn. */
export type ActiveViewRole = Extract<ViewRole,'parent'|'school_board'|'culture_social_office'|'central_kitchen'|'school_kitchen'>
export const availableViewRoles:readonly ActiveViewRole[] = ['parent','school_board','culture_social_office','central_kitchen','school_kitchen']
export const isActiveViewRole = (value:ViewRole):value is ActiveViewRole => availableViewRoles.some(role=>role===value)
export type CentralKitchenRole = 'manager'|'head_chef'|'prep'|'cook'|'packing'|'dispatcher'|'sanitation'
export const centralKitchenRoleLabels:Record<CentralKitchenRole,string>={manager:'Quản lý bếp trung tâm',head_chef:'Bếp trưởng',prep:'Nhân viên sơ chế',cook:'Nhân viên nấu chính',packing:'Nhân viên chia suất & đóng gói',dispatcher:'Điều phối giao nhận',sanitation:'Nhân viên vệ sinh bếp'}
export const centralKitchenRouteAccess:Record<CentralKitchenRole,string[]>={manager:['/','/thuc-don','/tao-mon','/giam-sat','/ma-qr-suat-an','/quan-ly-kho','/nha-cung-cap','/ho-so','/phan-anh','/bao-cao'],head_chef:['/','/thuc-don','/tao-mon','/giam-sat','/quan-ly-kho'],prep:['/','/thuc-don','/giam-sat'],cook:['/','/thuc-don','/tao-mon','/giam-sat'],packing:['/','/thuc-don','/giam-sat','/ma-qr-suat-an'],dispatcher:['/','/giam-sat','/ma-qr-suat-an'],sanitation:['/','/giam-sat','/ho-so']}
type UI = { schoolId: string; date: string; role:ViewRole; kitchenRole:CentralKitchenRole; setRole:(role:ViewRole)=>void; setKitchenRole:(role:CentralKitchenRole)=>void; setSchool: (id: string) => void; setDate: (date: string) => void }
export const useUI = create<UI>(set => ({ schoolId: 'an-phu', date: '2026-10-17', role:'parent',kitchenRole:'manager',setRole:role=>set({role:isActiveViewRole(role)?role:'parent'}),setKitchenRole:kitchenRole=>set({kitchenRole}),setSchool: schoolId => set({schoolId}), setDate: date => set({date}) }))
