import { BadRequestException, ConflictException } from '@nestjs/common';

export type ServingStageReport = {
  actualServings: number;
  occurredAt: string;
  handlerName: string;
  sanitaryCondition: 'PASS' | 'ISSUE';
  discrepancyNote: string | null;
  dishChecks: Array<{ dishId: string; name: string; status: 'PASS' | 'ISSUE' }>;
};

type Dish = { id: string; name: string };

export function validateServingStageReport(body: any, stage: 'PLATED' | 'READY',
  dishes: Dish[], plannedServings: number, serviceDate: string): ServingStageReport {
  if (!dishes.length || !Number.isInteger(plannedServings) || plannedServings < 1)
    throw new ConflictException('Chưa có thực đơn được duyệt để đối chiếu khi ra món và phục vụ.');
  const actualServings = body.actualServings;
  if (!Number.isSafeInteger(actualServings) || actualServings < 0 || actualServings > 1000000)
    throw new BadRequestException('Số suất thực tế phải là số nguyên từ 0 đến 1.000.000.');
  const occurredAt = typeof body.occurredAt === 'string' ? body.occurredAt.trim() : '';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(occurredAt))
    throw new BadRequestException('Thời điểm thực hiện phải đúng định dạng HH:mm.');
  const happened = new Date(serviceDate + 'T' + occurredAt + ':00+07:00').getTime();
  if (!Number.isFinite(happened) || happened > Date.now()+60000)
    throw new BadRequestException('Không thể ghi nhận thời gian ở tương lai.');
  const handlerName=typeof body.handlerName==='string'?body.handlerName.trim():'';
  if (handlerName.length<2 || handlerName.length>120)
    throw new BadRequestException('Cần ghi tên người thực hiện từ 2 đến 120 ký tự.');
  const sanitaryCondition=body.sanitaryCondition;
  if (!['PASS','ISSUE'].includes(sanitaryCondition))
    throw new BadRequestException('Phải đối chiếu vệ sinh khu vực và dụng cụ phục vụ.');
  if (!Array.isArray(body.dishChecks) || body.dishChecks.length!==dishes.length || dishes.length>100)
    throw new BadRequestException('Phải đối chiếu đầy đủ món trong thực đơn đã duyệt.');
  const expected=new Map(dishes.map(d=>[d.id,d.name]));
  const used=new Set<string>();
  const dishChecks=body.dishChecks.map((line:any)=>{
    if (!line || typeof line.dishId!=='string' || !expected.has(line.dishId) || used.has(line.dishId))
      throw new BadRequestException('Món ăn không thuộc thực đơn hoặc bị trùng.');
    used.add(line.dishId);
    if(!['PASS','ISSUE'].includes(line.status))
      throw new BadRequestException('Chọn Đạt hoặc Có bất thường cho từng món.');
    return {dishId:line.dishId,name:expected.get(line.dishId)!,status:line.status as 'PASS'|'ISSUE'};
  });
  const discrepancyNote=typeof body.discrepancyNote==='string'?body.discrepancyNote.trim():'';
  const hasIssue=actualServings!==plannedServings || sanitaryCondition==='ISSUE' || dishChecks.some(d=>d.status==='ISSUE');
  if (hasIssue && discrepancyNote.length<10)
    throw new BadRequestException('Có chênh lệch hoặc bất thường; phải ghi hướng xử lý ít nhất 10 ký tự.');
  if(discrepancyNote.length>1000)
    throw new BadRequestException('Ghi chú xử lý tối đa 1000 ký tự.');
  if(stage==='READY' && hasIssue)
    throw new ConflictException('Chưa xử lý hết bất thường; không được ghi Sẵn sàng phục vụ.');
  if(stage==='READY' && body.servingAreaChecked!==true)
    throw new BadRequestException('Phải xác nhận đã kiểm tra khu vực phục vụ.');
  return {actualServings,occurredAt,handlerName,sanitaryCondition,discrepancyNote:discrepancyNote||null,dishChecks};
}
