/**
 * Thời gian giao nhận theo giờ HH:mm đã lưu trong phiếu xuất bếp/tiếp nhận.
 * Chỉ hiển thị sau khi cả hai mốc được xác nhận; không suy diễn số liệu.
 * Mỗi phiếu giám sát có khóa (schoolId, serviceDate, mealType) từ API.
 */
export function calculateTransportMinutes(
  serviceDate: string,
  dispatchTime?: string | null,
  arrivalTime?: string | null,
  dispatchConfirmed?: boolean,
  arrivalConfirmed?: boolean,
): number | null {
  if (!dispatchConfirmed || !arrivalConfirmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return null
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (!dispatchTime || !arrivalTime || !clock.test(dispatchTime) || !clock.test(arrivalTime)) return null
  const dispatch = Date.parse(`${serviceDate}T${dispatchTime}:00+07:00`)
  const arrival = Date.parse(`${serviceDate}T${arrivalTime}:00+07:00`)
  if (!Number.isFinite(dispatch) || !Number.isFinite(arrival)) return null
  const minutes = Math.round((arrival - dispatch) / 60000)
  // Một bữa giao nhận trong ngày. Dữ liệu nghịch thời gian cần rà soát,
  // không tự cộng 24 giờ vì sẽ tạo ra số liệu giả khi nhập nhầm.
  return minutes >= 0 && minutes <= 24 * 60 ? minutes : null
}
