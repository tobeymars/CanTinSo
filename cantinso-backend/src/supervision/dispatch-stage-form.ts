import { BadRequestException } from '@nestjs/common';

export type DispatchStageReport={
  dispatchTime:string;handlerName:string;deliveryPerson:string;transportUnit:string;
  actualServings:number;packaging:'PASS'|'ISSUE';sensory:'PASS'|'ISSUE';
  dishChecks:{dishId:string;name:string;status:'PASS'|'ISSUE';servings:number}[];
  discrepancyNote:string|null;photo:string;hasIssue:boolean;
};
const clock=(value:unknown):value is string=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const name=(value:unknown,max=120):value is string=>typeof value==='string'&&value.trim().length>=2&&value.trim().length<=max;
const quantity=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=1000000;
export function validateDispatchStageReport(
  body:Record<string,unknown>,dishes:{id:string;name:string}[],plannedServings:number,
):DispatchStageReport{
  if(!clock(body.dispatchTime))throw new BadRequestException('Giờ xuất bếp phải theo định dạng HH:mm.');
  if(!name(body.handlerName))throw new BadRequestException('Cần họ tên nhân viên phụ trách xuất bếp.');
  if(!name(body.deliveryPerson))throw new BadRequestException('Cần họ tên người nhận bàn giao vận chuyển.');
  if(!name(body.transportUnit,160))throw new BadRequestException('Cần tên đơn vị hoặc phương tiện vận chuyển.');
  if(!quantity(body.actualServings)||body.actualServings===0)throw new BadRequestException('Số suất thực xuất phải là số nguyên dương.');
  if(!Number.isSafeInteger(plannedServings)||plannedServings<=0||!dishes.length)
    throw new BadRequestException('Không có thực đơn được duyệt và số suất để đối chiếu khi xuất bếp.');
  if(!['PASS','ISSUE'].includes(String(body.packaging))||!['PASS','ISSUE'].includes(String(body.sensory)))
    throw new BadRequestException('Cần đánh giá bao gói và cảm quan món ăn.');
  if(!Array.isArray(body.dishChecks)||body.dishChecks.length!==dishes.length)
    throw new BadRequestException('Phải đối chiếu đủ từng món theo thực đơn đã duyệt.');
  const byId=new Map(dishes.map(d=>[d.id,d.name]));
  const seen=new Set<string>();
  const checks=body.dishChecks.map((line:unknown)=>{
    if(!line||typeof line!=='object')throw new BadRequestException('Chi tiết món xuất bếp không hợp lệ.');
    const item=line as Record<string,unknown>;
    if(typeof item.dishId!=='string'||!byId.has(item.dishId)||seen.has(item.dishId))
      throw new BadRequestException('Món xuất bếp không thuộc thực đơn hoặc bị lặp.');
    seen.add(item.dishId);
    if(item.status!=='PASS'&&item.status!=='ISSUE')throw new BadRequestException('Kết quả đối chiếu món không hợp lệ.');
    if(!quantity(item.servings))throw new BadRequestException('Số suất từng món phải là số nguyên không âm.');
    return {dishId:item.dishId,name:byId.get(item.dishId)!,status:item.status,servings:item.servings};
  });
  if(typeof body.photo!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.photo)||body.photo.length>1100000)
    throw new BadRequestException('Cần ảnh thực tế khi xuất bếp (JPEG/PNG/WebP, tối đa 750 KB).');
  const hasIssue=body.actualServings!==plannedServings||body.packaging==='ISSUE'||body.sensory==='ISSUE'||
    checks.some(c=>c.status==='ISSUE'||c.servings!==body.actualServings);
  const note=typeof body.discrepancyNote==='string'?body.discrepancyNote.trim():'';
  if(hasIssue&&note.length<10)throw new BadRequestException('Có sai lệch: cần ghi lý do và biện pháp xử lý tối thiểu 10 ký tự.');
  if(note.length>1000)throw new BadRequestException('Ghi chú xử lý tối đa 1000 ký tự.');
  return {dispatchTime:body.dispatchTime,handlerName:body.handlerName.trim(),deliveryPerson:body.deliveryPerson.trim(),
    transportUnit:body.transportUnit.trim(),actualServings:body.actualServings,packaging:body.packaging as 'PASS'|'ISSUE',
    sensory:body.sensory as 'PASS'|'ISSUE',dishChecks:checks,discrepancyNote:note||null,
    photo:body.photo,hasIssue};
}
