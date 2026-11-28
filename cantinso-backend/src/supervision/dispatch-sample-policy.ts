import { ConflictException } from '@nestjs/common';

/**
 * Xuất bếp không chờ mẫu đủ 24 giờ. Chỉ cần ghi nhận lấy mẫu hợp lệ
 * trước thời điểm xuất bếp; 24 giờ chỉ dùng để quyết định hủy mẫu.
 * Hồ sơ miễn lưu mẫu chỉ áp dụng khi đã được xác nhận hợp lệ lúc tạo báo cáo.
 */
export function verifySamplesBeforeDispatch(
  sampleCheck: unknown,
  processingCheck: unknown,
  dispatchAt: Date,
): void {
  const sampleRecord = asRecord(sampleCheck);
  const processingRecord = asRecord(processingCheck);
  if (processingRecord.status !== 'reported' && processingRecord.status !== 'confirmed')
    throw new ConflictException('Cần báo cáo kiểm thực bước 2 trước khi xuất bếp.');
  if (asRecord(processingRecord.inspection).isPass !== true)
    throw new ConflictException('Kiểm thực bước 2 chưa có kết quả Đạt; không thể xuất bếp.');

  if (sampleRecord.status !== 'reported' && sampleRecord.status !== 'confirmed')
    throw new ConflictException('Cần ghi nhận lấy mẫu thức ăn trước khi xuất bếp; không phải chờ 24 giờ.');
  const inspection = asRecord(sampleRecord.inspection);
  if (inspection.kind !== 'food_sample' || inspection.isPass !== true)
    throw new ConflictException('Cần có hồ sơ lưu mẫu hợp lệ theo thực đơn trước khi xuất bếp.');

  if (inspection.notApplicable === true) {
    if (!Array.isArray(inspection.dishes) || inspection.dishes.length !== 0 || typeof inspection.reason !== 'string' || !inspection.reason.trim())
      throw new ConflictException('Hồ sơ miễn lưu mẫu không hợp lệ; phải ghi lý do theo số suất được duyệt.');
    return;
  }

  if (!Array.isArray(inspection.dishes) || inspection.dishes.length === 0)
    throw new ConflictException('Chưa có mẫu lưu theo từng món; không thể xuất bếp.');
  const processing = asRecord(processingRecord.inspection);
  const cooked = Array.isArray(processing.dishes) ? processing.dishes : [];
  if (cooked.length !== inspection.dishes.length)
    throw new ConflictException('Danh sách món lưu mẫu chưa khớp danh sách món đã chế biến.');
  const deadline = dispatchAt.getTime();
  const ids = new Set<string>();
  for (const raw of inspection.dishes) {
    const line = asRecord(raw);
    const id = line.dishId;
    const sampledAt = typeof line.takenAt === 'string' ? Date.parse(line.takenAt + ':00+07:00') : NaN;
    if (typeof id !== 'string' || ids.has(id) || !cooked.some((dish:unknown) => asRecord(dish).dishId === id) ||
        !Number.isFinite(sampledAt) || sampledAt > deadline)
      throw new ConflictException('Phải lấy mẫu từng món trước thời điểm xuất bếp.');
    ids.add(id);
    const dish = asRecord(cooked.find((item:unknown) => asRecord(item).dishId === id));
    const cookedAt = typeof dish.cookedAt === 'string' ? Date.parse(dish.cookedAt + ':00+07:00') : NaN;
    if (!Number.isFinite(cookedAt) || sampledAt < cookedAt)
      throw new ConflictException('Thời điểm lấy mẫu phải sau khi chế biến xong món ăn.');
  }
}

function asRecord(value: unknown): Record<string,unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
}
