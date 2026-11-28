import { BadRequestException, ForbiddenException } from '@nestjs/common';

export const vietnamServiceDate = (now = new Date()):string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',
  }).format(now);

/**
 * Viewing past and future dates is allowed.
 * Actual reporting/approval is blocked in the future; late actions require a reason.
 * Server time in Vietnam is authoritative, not the browser's system clock.
 */
export function validateSupervisionWriteDate(serviceDate:string,body:unknown,now = new Date()):string{
  const today=vietnamServiceDate(now);
  if(serviceDate>today)
    throw new ForbiddenException('Ngày phục vụ chưa đến. Chỉ được xem kế hoạch, không ghi nhận kiểm thực hoặc xác nhận trước.');
  if(serviceDate===today)return '';
  const data=body&&typeof body==='object'?body as {lateReason?:unknown}:{};
  const reason=typeof data.lateReason==='string'?data.lateReason.trim():'';
  if(reason.length<10||reason.length>1000)
    throw new BadRequestException('Cập nhật hồ sơ ngày trước phải có lý do bổ sung từ 10 đến 1000 ký tự.');
  return reason;
}
