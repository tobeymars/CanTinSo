import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type StockEvidence = {
  category:string; filename:string;mimeType:string;size:number;sha256:string;data:Buffer;
};
const allowed = new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const categories = new Set(['DELIVERY_NOTE','LOT_PHOTO','INVOICE','QUALITY_CERTIFICATE','ISSUE_PHOTO','SCALE_PHOTO','RETURN_PHOTO','OTHER']);
export function validateStockEvidence(input:unknown,kind:'RECEIPT'|'ISSUE'|'RETURN'):StockEvidence[]{
  if(!Array.isArray(input)||input.length<2||input.length>8)
    throw new BadRequestException('Phiếu kho phải có từ 2 đến 8 tệp minh chứng.');
  const result:StockEvidence[]=[];
  let total=0;
  for(const item of input){
    if(!item||typeof item!=='object')throw new BadRequestException('Tệp minh chứng không hợp lệ.');
    const e=item as Record<string,unknown>;
    const category=e.category,filename=e.filename,mimeType=e.mimeType,base64=e.base64;
    if(typeof category!=='string'||!categories.has(category))throw new BadRequestException('Loại minh chứng không hợp lệ.');
    if(typeof filename!=='string'||filename.trim().length<1||filename.length>200||/[\\/\x00-\x1f]/.test(filename))
      throw new BadRequestException('Tên tệp minh chứng không hợp lệ.');
    if(typeof mimeType!=='string'||!allowed.has(mimeType))throw new BadRequestException('Chỉ chấp nhận PDF, JPG, PNG, WEBP.');
    if(typeof base64!=='string'||base64.length<12||base64.length>2_800_000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
      throw new BadRequestException('Nội dung minh chứng phải là base64 hợp lệ, tối đa 2 MB/tệp.');
    const data=Buffer.from(base64,'base64');
    total+=data.length;
    if(data.length<12||data.length>2*1024*1024||total>8*1024*1024)
      throw new BadRequestException('Tệp quá lớn: tối đa 2 MB/tệp và 8 MB/phiếu.');
    const valid=mimeType==='application/pdf'?data.subarray(0,5).toString()==='%PDF-':
      mimeType==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
      mimeType==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:
      data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
    if(!valid)throw new BadRequestException('Tệp không đúng định dạng PDF/ảnh đã khai báo.');
    result.push({category,filename:filename.trim(),mimeType,size:data.length,
      sha256:createHash('sha256').update(data).digest('hex'),data});
  }
  for(const required of kind==='RECEIPT'?['DELIVERY_NOTE','LOT_PHOTO']:kind==='ISSUE'?['ISSUE_PHOTO','SCALE_PHOTO']:['RETURN_PHOTO','SCALE_PHOTO']){
    if(!result.some(item=>item.category===required))
      throw new BadRequestException('Thiếu minh chứng bắt buộc: '+required);
  }
  if(kind==='RECEIPT'&&result.find(item=>item.category==='LOT_PHOTO')?.mimeType==='application/pdf')
    throw new BadRequestException('Ảnh lô hàng phải ở định dạng hình ảnh.');
  if(kind!=='RECEIPT'&&result.some(item=>[kind==='RETURN'?'RETURN_PHOTO':'ISSUE_PHOTO','SCALE_PHOTO'].includes(item.category)&&item.mimeType==='application/pdf'))
    throw new BadRequestException('Ảnh xuất kho và ảnh cân phải ở định dạng hình ảnh.');
  return result;
}
const label=(v:unknown,name:string,max:number)=>{
 const t=typeof v==='string'?v.trim():'';
 if(t.length<2||t.length>max)throw new BadRequestException('Thiếu hoặc sai '+name+'.');
 return t;
};
export function validateStockInspection(value:unknown,kind:'RECEIPT'|'ISSUE'|'RETURN'){
  if(!value||typeof value!=='object')throw new BadRequestException('Thiếu biên bản kiểm nhận/kiểm xuất.');
  const v=value as Record<string,unknown>;
  const inspector=label(v.inspector,'người kiểm tra',120);
  const counterparty=label(v.counterparty,kind==='RECEIPT'?'người giao':'người nhận nguyên liệu',120);
  const location=label(v.location,'khu vực giao nhận hoặc xuất kho',160);
  const documentNumber=label(v.documentNumber,'mã chứng từ',120);
  const actualTime=typeof v.actualTime==='string'?v.actualTime.trim():'';
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(actualTime))throw new BadRequestException('Giờ kiểm nhận/kiểm xuất phải theo HH:mm.');
  const checks=kind==='RECEIPT'?['documents','packaging','sensory','transport','quantity']:kind==='ISSUE'?['packaging','quantity','weighing']:['packaging','quantity','weighing','transport'];
  for(const name of checks){
    if(v[name]!=='PASS')throw new BadRequestException('Chưa kiểm tra đạt: '+name+'. Hàng không đạt phải cách ly và lập biên bản riêng.');
  }
  const temperatureC=v.temperatureC===''||v.temperatureC===null||v.temperatureC===undefined?null:Number(v.temperatureC);
  if(temperatureC!==null&&(!Number.isFinite(temperatureC)||temperatureC< -40||temperatureC>120))
    throw new BadRequestException('Nhiệt độ kiểm tra không hợp lệ.');
  const remarks=typeof v.remarks==='string'?v.remarks.trim():'';
  if(remarks.length>1000)throw new BadRequestException('Ghi chú tối đa 1.000 ký tự.');
  return {inspector,counterparty,location,documentNumber,actualTime,temperatureC,
    checks:Object.fromEntries(checks.map(name=>[name,'PASS'])),
    remarks};
}
