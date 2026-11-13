import type { ViewRole } from './store'

/** Quyền của hai phân hệ Kho hàng và Nhà cung cấp trong DEMO.
 * Ban Giám hiệu, Phòng VH–XH chỉ giám sát; bếp chịu trách nhiệm tác nghiệp.
 * Khi triển khai thật, API phải thực thi RBAC và phạm vi trường/địa bàn độc lập.
 */
export const canViewSupplyChain = (role: ViewRole): boolean =>
  ['school_board', 'culture_social_office', 'central_kitchen', 'school_kitchen'].includes(role)

export const canManageSupplyChain = (role: ViewRole): boolean =>
  role === 'central_kitchen' || role === 'school_kitchen'
