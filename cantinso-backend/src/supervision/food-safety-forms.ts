import { BadRequestException } from '@nestjs/common';

export type FoodSafetyKind = 'processing' | 'before_serving' | 'food_sample';
type Dish = {id:string;name:string};
const fail=(message:string):never=>{throw new BadRequestException(message)};
const str=(value:unknown,label:string,max=300):string=>{
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail('Thiếu hoặc sai '+label+'.');
  return (value as string).trim();
};
const integer=(value:unknown,label:string):number=>{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0||value>1000000)fail('Số suất '+label+' phải là số nguyên dương.');
  return value as number;
};
const moment=(value:unknown,label:string,serviceDate:string):string=>{
  if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value))fail('Thời điểm '+label+' phải có ngày và giờ.');
  const v=value as string;
  if(v.slice(0,10)!==serviceDate||!Number.isFinite(Date.parse(v+':00+07:00'))||
      new Date(v+':00+07:00').toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'})!==serviceDate)
    fail('Thời điểm '+label+' phải thuộc ngày phục vụ.');
  if(new Date(v+':00+07:00').getTime()>Date.now()+60000)fail('Không được ghi thời điểm thực tế trong tương lai.');
  return v;
};
const result=(value:unknown,label:string):'pass'|'fail'=>value==='pass'||value==='fail'?value:fail('Phải đánh giá đạt/không đạt cho '+label+'.');
const status=(value:unknown,label:string)=>result(value,label);
const uniqueDish=(items:unknown,dishes:Dish[])=>{
  if(!dishes.length)fail('Chưa có thực đơn được duyệt cho trường, ngày và bữa.');
  if(!Array.isArray(items)||items.length!==dishes.length)fail('Phải kiểm tra đầy đủ từng món trong thực đơn đã duyệt.');
  const ids=new Set<string>();
  for(const line of items as Record<string,unknown>[]){
    const dishId=line?.dishId;
    if(typeof dishId!=='string')
      fail('Danh sách món không đúng thực đơn hoặc bị trùng.');
    if(ids.has(dishId as string)||!dishes.some(d=>d.id===dishId))
      fail('Danh sách món không đúng thực đơn hoặc bị trùng.');
    ids.add(dishId as string);
  }
  return items as Record<string,unknown>[];
};
export function validateFoodSafetyForm(kind:FoodSafetyKind,raw:unknown,approvedDishes:Dish[],serviceDate:string,plannedServings?:number){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Thiếu nội dung biểu mẫu chuyên môn.');
  const data=raw as Record<string,unknown>;
  if(kind==='food_sample' && data.notApplicable===true){
    if(typeof plannedServings!=='number'||!Number.isSafeInteger(plannedServings)||plannedServings<1||plannedServings>=30 || approvedDishes.length===0)
      fail('Chỉ được ghi không bắt buộc lưu mẫu khi bữa đã duyệt có từ 1 đến 29 suất.');
    return {kind,notApplicable:true,reason:str(data.reason,'lý do không áp dụng lưu mẫu',1000),
      inspector:'',location:'',checkedAt:'',isPass:true,dishes:[],standard:'1246/QD-BYT-2017',version:1};
  }
  const inspector=str(data.inspector,'người kiểm tra');
  const location=str(data.location,'địa điểm kiểm tra');
  const checkedAt=moment(data.checkedAt,'kiểm tra',serviceDate);
  const lines=uniqueDish(data.dishes,approvedDishes);
  const dishes=lines.map(line=>{
    const dish=approvedDishes.find(d=>d.id===line.dishId)!;
    const servings=integer(line.servings,dish.name);
    if(kind==='processing'){
      const prepFinishedAt=moment(line.prepFinishedAt,'sơ chế '+dish.name,serviceDate);
      const cookedAt=moment(line.cookedAt,'chế biến '+dish.name,serviceDate);
      if(prepFinishedAt>cookedAt||cookedAt>checkedAt)fail('Thời gian sơ chế, chế biến hoặc kiểm tra không đúng thứ tự: '+dish.name);
      const workerHygiene=status(line.workerHygiene,'người chế biến '+dish.name);
      const toolsHygiene=status(line.toolsHygiene,'dụng cụ '+dish.name);
      const areaHygiene=status(line.areaHygiene,'khu vực '+dish.name);
      const sensory=status(line.sensory,'cảm quan '+dish.name);
      const disposition=str(line.disposition,'biện pháp xử lý / ghi chú '+dish.name,1000);
      return {dishId:dish.id,dishName:dish.name,servings,ingredients:str(line.ingredients,'nguyên liệu chính '+dish.name,1000),
        prepFinishedAt,cookedAt,workerHygiene,toolsHygiene,areaHygiene,sensory,disposition};
    }
    if(kind==='before_serving'){
      const platedAt=moment(line.platedAt,'chia món '+dish.name,serviceDate);
      const servedAt=moment(line.servedAt,'bắt đầu ăn '+dish.name,serviceDate);
      if(platedAt>servedAt||servedAt>checkedAt)fail('Thời gian chia món hoặc bắt đầu ăn không đúng thứ tự: '+dish.name);
      return {dishId:dish.id,dishName:dish.name,servings,platedAt,servedAt,
        utensils:status(line.utensils,'dụng cụ chia/che đậy '+dish.name),sensory:status(line.sensory,'cảm quan '+dish.name),
        disposition:str(line.disposition,'biện pháp xử lý / ghi chú '+dish.name,1000)};
    }
    const foodType=line.foodType==='solid'?'solid':line.foodType==='liquid'?'liquid':fail('Phải chọn thức ăn đặc hoặc lỏng: '+dish.name);
    const amount=Number(line.amount);
    const min=foodType==='solid'?100:150;
    const unit=foodType==='solid'?'g':'ml';
    if(!Number.isFinite(amount)||amount<min||amount>10000)fail('Lượng mẫu '+dish.name+' phải từ '+min+' '+unit+'.');
    const temperature=Number(line.temperature);
    if(!Number.isFinite(temperature)||temperature<2||temperature>8)fail('Nhiệt độ mẫu '+dish.name+' phải từ 2–8°C.');
    const takenAt=moment(line.takenAt,'lấy mẫu '+dish.name,serviceDate);
    if(takenAt>checkedAt)fail('Thời gian lấy mẫu phải trước hoặc bằng thời gian kiểm tra: '+dish.name);
    return {dishId:dish.id,dishName:dish.name,servings,foodType,amount,unit,temperature,takenAt,
      container:str(line.container,'dụng cụ chứa mẫu '+dish.name),
      sealCode:str(line.sealCode,'mã niêm phong '+dish.name),
      storedAt:str(line.storedAt,'vị trí lưu mẫu '+dish.name),
      sampledBy:str(line.sampledBy,'người lưu mẫu '+dish.name),
      qualityNote:str(line.qualityNote,'chất lượng mẫu '+dish.name,1000)};
  });
  const isPass=kind==='food_sample'||dishes.every(line=>{
    const fields=kind==='processing'?['workerHygiene','toolsHygiene','areaHygiene','sensory']:['utensils','sensory'];
    return fields.every(field=>(line as Record<string,unknown>)[field]==='pass');
  });
  return {kind,inspector,location,checkedAt,dishes,isPass,standard:'1246/QD-BYT-2017',version:1};
}
