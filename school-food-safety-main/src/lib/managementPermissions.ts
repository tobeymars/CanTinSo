import type { ViewRole } from './store'
import { getStoredUser } from './authApi'

/** Quyền của hai phân hệ Kho hàng và Nhà cung cấp trong DEMO.
 * Ban Giám hiệu, Phòng VH–XH chỉ giám sát; bếp chịu trách nhiệm tác nghiệp.
 * Khi triển khai thật, API phải thực thi RBAC và phạm vi trường/địa bàn độc lập.
 */
export const canViewSupplyChain = (role: ViewRole): boolean =>
  ['school_board', 'culture_social_office', 'central_kitchen', 'school_kitchen'].includes(role)

export const canManageSupplyChain = (role: ViewRole): boolean => {
  if (role === 'central_kitchen') return true
  if (role !== 'school_kitchen') return false
  const user = getStoredUser()
  // Demo mode remains interactive; real SCHOOL_KITCHEN accounts need an explicit kitchen scope.
  return !user || !!user.kitchenId
}
