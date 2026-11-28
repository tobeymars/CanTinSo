import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateFoodSafetyForm } from './food-safety-forms';

const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-2*86400000));
const at=(time:string)=>date+'T'+time;
const dishes=[{id:'id-1',name:'Cơm gà'},{id:'id-2',name:'Canh bí'}];
const base={inspector:'Nguyễn Văn A',location:'Bếp Long Hoa',checkedAt:at('12:00')};
const processing={
  ...base,
  dishes:dishes.map(dish=>({dishId:dish.id,servings:100,ingredients:'Gạo 2 kg, thịt 3 kg',
    prepFinishedAt:at('08:00'),cookedAt:at('09:00'),
    workerHygiene:'pass',toolsHygiene:'pass',areaHygiene:'pass',sensory:'pass',disposition:'Không có'})),
};
const before={
  ...base,
  dishes:dishes.map(dish=>({dishId:dish.id,servings:100,platedAt:at('10:00'),
    servedAt:at('11:00'),utensils:'pass',sensory:'pass',disposition:'Không có'})),
};
const samples={
  ...base,
  dishes:dishes.map((dish,i)=>({dishId:dish.id,servings:100,foodType:i?'liquid':'solid',
    amount:i?150:100,temperature:4,takenAt:at('10:30'),container:'Hộp kín vô trùng',
    sealCode:'NIEM-'+i,storedAt:'Tủ lạnh mẫu 1',sampledBy:'Nguyễn Văn A',qualityNote:'Mẫu còn nguyên'})),
};

test('requires every item in the approved menu without duplicates',()=>{
  assert.equal(validateFoodSafetyForm('processing',processing,dishes,date).dishes.length,2);
  assert.throws(()=>validateFoodSafetyForm('processing',{...processing,dishes:processing.dishes.slice(0,1)},dishes,date),/đầy đủ/);
  assert.throws(()=>validateFoodSafetyForm('processing',{...processing,dishes:[processing.dishes[0],processing.dishes[0]]},dishes,date),/trùng/);
});
test('enforces observed conditions and never defaults to pass',()=>{
  assert.equal(validateFoodSafetyForm('processing',processing,dishes,date).isPass,true);
  const abnormal={...processing,dishes:[{...processing.dishes[0],sensory:'fail',disposition:'Mùi lạ, đã cách ly'},processing.dishes[1]]};
  assert.equal(validateFoodSafetyForm('processing',abnormal,dishes,date).isPass,false);
  assert.throws(()=>validateFoodSafetyForm('processing',{...processing,dishes:[{...processing.dishes[0],sensory:''},processing.dishes[1]]},dishes,date),/đạt\/không đạt/);
});
test('step 2 timestamps must be ordered and processing hygiene declared',()=>{
  assert.throws(()=>validateFoodSafetyForm('processing',{...processing,dishes:[{...processing.dishes[0],prepFinishedAt:at('11:00'),cookedAt:at('10:00')},processing.dishes[1]]},dishes,date),/thứ tự/);
  assert.throws(()=>validateFoodSafetyForm('processing',{...processing,dishes:[{...processing.dishes[0],toolsHygiene:''},processing.dishes[1]]},dishes,date));
});
test('step 3 requires serving checks and correct order of preparation and eating',()=>{
  assert.equal(validateFoodSafetyForm('before_serving',before,dishes,date).isPass,true);
  assert.throws(()=>validateFoodSafetyForm('before_serving',{...before,dishes:[{...before.dishes[0],platedAt:at('11:30'),servedAt:at('11:00')},before.dishes[1]]},dishes,date),/thứ tự/);
});
test('sample requires sealed item per dish, correct quantity and 2–8C refrigeration',()=>{
  assert.equal(validateFoodSafetyForm('food_sample',samples,dishes,date).dishes.length,2);
  assert.throws(()=>validateFoodSafetyForm('food_sample',{...samples,dishes:[{...samples.dishes[0],amount:99},samples.dishes[1]]},dishes,date),/100 g/);
  assert.throws(()=>validateFoodSafetyForm('food_sample',{...samples,dishes:[samples.dishes[0],{...samples.dishes[1],amount:149}]},dishes,date),/150 ml/);
  assert.throws(()=>validateFoodSafetyForm('food_sample',{...samples,dishes:[{...samples.dishes[0],temperature:9},samples.dishes[1]]},dishes,date),/2–8/);
  assert.throws(()=>validateFoodSafetyForm('food_sample',{...samples,dishes:[{...samples.dishes[0],sealCode:''},samples.dishes[1]]},dishes,date),/niêm phong/);
});
test('rejects records dated outside the selected day',()=>{
  assert.throws(()=>validateFoodSafetyForm('food_sample',{...samples,checkedAt:'2025-01-01T12:00'},dishes,date),/ngày phục vụ/);
});

test('sample exemption is explicit and only permitted for approved meals with 1–29 servings',()=>{
  const raw={notApplicable:true,reason:'Bữa ăn 20 suất, dưới ngưỡng 30 suất'};
  const result=validateFoodSafetyForm('food_sample',raw,dishes,date,20);
  assert.equal(result.isPass,true);
  assert.deepEqual(result.dishes,[]);
  assert.throws(()=>validateFoodSafetyForm('food_sample',raw,dishes,date,30),/1 đến 29/);
  assert.throws(()=>validateFoodSafetyForm('food_sample',raw,dishes,date,0),/1 đến 29/);
  assert.throws(()=>validateFoodSafetyForm('food_sample',raw,[],date,20),/1 đến 29/);
});
