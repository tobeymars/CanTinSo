import { BadRequestException, ConflictException } from '@nestjs/common';

export type DeliveryDish = { id: string; name: string };
export type ArrivalReceipt = {
  arrivalTime: string;
  deliveryPerson: string;
  transportUnit: string | null;
  receivedServings: number;
  packaging: 'OK' | 'ISSUE';
  sensory: 'OK' | 'ISSUE';
  dishChecks: { dishId: string; name: string; status: 'MATCH' | 'SHORT' | 'MISSING'; temperatureC: number | null }[];
  result: 'ACCEPTED' | 'CONDITIONAL' | 'REJECTED';
  condition: 'GOOD' | 'WITH_NOTES';
  receiptChecked: true;
  photo: string | null;
};
export function validateArrivalReceipt(
  body: any,
  dishes: DeliveryDish[],
  plannedServings: number,
  date: string,
  dispatchedAt: string,
): ArrivalReceipt {
  if (!dishes.length || !Number.isSafeInteger(plannedServings) || plannedServings < 1)
    throw new ConflictException('Chưa có thực đơn được duyệt để đối chiếu khi tiếp nhận.');
  const arrivalTime = typeof body.arrivalTime === 'string' ? body.arrivalTime.trim() : '';
  if (!/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(arrivalTime))
    throw new BadRequestException('Giờ đến thực tế phải đúng định dạng HH:mm.');
  const arrivalAt = new Date(date + 'T' + arrivalTime + ':00+07:00');
  if (!Number.isFinite(arrivalAt.getTime()) || arrivalAt.getTime() > Date.now() + 60000)
    throw new BadRequestException('Thời gian đến trường không thể ở tương lai.');
  // When dispatch was recorded on the actual service date, arrival cannot precede it.
  const dispatchDate = new Date(dispatchedAt);
  const dispatchLocalDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(dispatchDate);
  if (dispatchLocalDate === date && arrivalAt.getTime() < dispatchDate.getTime() - 60000)
    throw new BadRequestException('Giờ đến trường không thể trước thời điểm Xuất bếp.');
  const deliveryPerson = typeof body.deliveryPerson === 'string' ? body.deliveryPerson.trim() : '';
  const transportUnit = typeof body.transportUnit === 'string' ? body.transportUnit.trim() : '';
  if (deliveryPerson.length < 2 || deliveryPerson.length > 120 || transportUnit.length > 150)
    throw new BadRequestException('Cần ghi người giao (2–120 ký tự), đơn vị vận chuyển tối đa 150 ký tự.');
  const receivedServings = body.receivedServings;
  if (!Number.isSafeInteger(receivedServings) || receivedServings < 1 || receivedServings > 1000000)
    throw new BadRequestException('Số suất thực nhận phải là số nguyên từ 1 đến 1.000.000.');
  const packaging = body.packaging, sensory = body.sensory, result = body.result;
  if (!['OK','ISSUE'].includes(packaging) || !['OK','ISSUE'].includes(sensory))
    throw new BadRequestException('Phải kiểm tra tình trạng bao gói và cảm quan khi giao nhận.');
  if (!['ACCEPTED','CONDITIONAL','REJECTED'].includes(result))
    throw new BadRequestException('Kết luận tiếp nhận không hợp lệ.');
  if (body.receiptChecked !== true)
    throw new BadRequestException('BGH phải xác nhận đã kiểm tra thực tế tại trường.');
  if (!Array.isArray(body.dishChecks) || body.dishChecks.length !== dishes.length || dishes.length > 100)
    throw new BadRequestException('Phải đối chiếu đủ các món trong thực đơn đã duyệt.');
  const expected = new Map(dishes.map(dish => [dish.id,dish.name]));
  const ids = new Set<string>();
  const dishChecks = body.dishChecks.map((item:any) => {
    if (!item || typeof item.dishId !== 'string' || !expected.has(item.dishId) || ids.has(item.dishId))
      throw new BadRequestException('Món được giao không thuộc thực đơn hoặc bị trùng.');
    ids.add(item.dishId);
    if (!['MATCH','SHORT','MISSING'].includes(item.status))
      throw new BadRequestException('Phải ghi đủ/thiếu/không nhận cho từng món.');
    const temperatureC = item.temperatureC === '' || item.temperatureC == null ? null : Number(item.temperatureC);
    if (temperatureC !== null && (!Number.isFinite(temperatureC) || temperatureC < -40 || temperatureC > 150))
      throw new BadRequestException('Nhiệt độ đo không hợp lệ.');
    return { dishId:item.dishId, name:expected.get(item.dishId)!, status:item.status, temperatureC };
  });
  const hasIssue = receivedServings !== plannedServings || packaging !== 'OK' || sensory !== 'OK' ||
    dishChecks.some(item => item.status !== 'MATCH');
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if ((hasIssue || result !== 'ACCEPTED') && note.length < 10)
    throw new BadRequestException('Khi có chênh lệch hoặc từ chối tiếp nhận, phải ghi rõ sai lệch và hướng xử lý (ít nhất 10 ký tự).');
  if (hasIssue && result === 'ACCEPTED')
    throw new ConflictException('Có bất thường hoặc số suất chênh lệch. Không thể xác nhận đủ điều kiện phục vụ.');
  const photo = typeof body.photo === 'string' && body.photo.trim() ? body.photo : null;
  if (photo && (!/^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 1100000))
    throw new BadRequestException('Ảnh giao nhận chỉ hỗ trợ JPG, PNG, WebP tối đa 750 KB.');
  return {arrivalTime,deliveryPerson,transportUnit:transportUnit || null,receivedServings,packaging,
    sensory,dishChecks,result,condition:hasIssue?'WITH_NOTES':'GOOD',receiptChecked:true,photo};
}

export function arrivalAllowsService(arrival: any): boolean {
  // Legacy confirmed deliveries have no structured receipt; retain historical behavior.
  return !arrival || arrival.result === 'ACCEPTED';
}
