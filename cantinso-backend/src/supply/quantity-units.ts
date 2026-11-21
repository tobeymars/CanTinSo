import { BadRequestException } from '@nestjs/common';

/** Canonical quantities stay in the already configured Ingredient.unit / InventoryLot.unit.
 * Never convert pieces/packages to mass or mass to volume without product-specific data.
 * The inventory database uses DECIMAL(12,3): smaller than 0.001 of the canonical unit is rejected.
 */
const unitInfo: Record<string,{family:'mass'|'volume';factor:number;label:string}> = {
  mg:{family:'mass',factor:0.001,label:'mg'},
  g:{family:'mass',factor:1,label:'g'},
  kg:{family:'mass',factor:1000,label:'kg'},
  ml:{family:'volume',factor:1,label:'ml'},
  l:{family:'volume',factor:1000,label:'lít'},
  'lít':{family:'volume',factor:1000,label:'lít'},
  lit:{family:'volume',factor:1000,label:'lít'},
};
export const unitText=(value:string)=>value.trim().toLocaleLowerCase('vi');
export function unitOptions(base:string):string[]{
  const key=unitText(base);
  const record=unitInfo[key];
  if(!record)return [base];
  if(record.family==='mass')return key==='mg'?['mg','g','kg']:['g','kg'];
  return ['ml','lít'];
}
export function canonicalQuantity(value:unknown, selected:unknown, canonical:string, options?:{allowZero?:boolean}){
  const number=Number(value);
  const allowZero=options?.allowZero??false;
  if(value===null||value===undefined||value===''||!Number.isFinite(number)||number<0||(!allowZero&&number===0))
    throw new BadRequestException('Số lượng phải lớn hơn 0 và có đơn vị đo rõ ràng.');
  if(Math.abs(number*1000000-Math.round(number*1000000))>0.0000001)throw new BadRequestException('Số lượng nhập chỉ hỗ trợ tối đa 6 chữ số thập phân.');
  const from=typeof selected==='string'&&selected.trim()?selected.trim():canonical;
  const a=unitInfo[unitText(from)],b=unitInfo[unitText(canonical)];
  if(a?.family!==b?.family && unitText(from)!==unitText(canonical))
    throw new BadRequestException('Không thể quy đổi '+from+' sang '+canonical+'. Chỉ được đổi trong cùng nhóm khối lượng hoặc thể tích.');
  if((a&&!b)||(!a&&b))throw new BadRequestException('Đơn vị nguyên liệu không tương thích.');
  const countUnits=new Set(['chai','hộp','cái','quả','gói','lon','túi','thùng','bịch','viên','củ','chiếc','phần','suất']);
  if(countUnits.has(unitText(canonical))&&!Number.isInteger(number))
    throw new BadRequestException('Đơn vị '+canonical+' phải nhập số lượng nguyên. Muốn quy đổi ra g, kg hoặc lít cần có quy cách đóng gói riêng.');
  const converted=unitText(from)===unitText(canonical)?number:number*a!.factor/b!.factor;
  const scaled=converted*1000;
  if(!Number.isFinite(scaled)||converted>100000000||Math.abs(scaled-Math.round(scaled))>0.0000001)
    throw new BadRequestException('Số lượng sau quy đổi sang '+canonical+' phải có tối đa 3 chữ số thập phân.');
  return {quantity:Math.round(scaled)/1000,enteredQuantity:number,enteredUnit:from,unit:canonical};
}
