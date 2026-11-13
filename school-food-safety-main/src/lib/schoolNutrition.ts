/**
 * BỘ MẪU THAM KHẢO CHO GIAO DIỆN DEMO — KHÔNG PHẢI CSDL THÀNH PHẦN THỰC PHẨM ĐƯỢC KIỂM ĐỊNH.
 * Các giá trị/100g bên dưới là số xấp xỉ để minh họa cách tính. Phải thay bằng bảng thực phẩm
 * được xác minh, phân biệt sống/chín và hệ số hao hụt trước khi phục vụ thực tế.
 * Cơ cấu nhóm tuổi, tỷ lệ P/L/G và bữa/ngày: Quyết định 3958/QĐ-BYT ngày 25/12/2025.
 * https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-3958-QD-BYT-2025-Huong-dan-dinh-duong-doi-voi-bua-an-hoc-duong-690450.aspx
 */
import type { BoardingMealType } from './boardingMenu'
export type SchoolAgeBand = 'GRADES_1_2' | 'GRADES_3_5' | 'GRADES_3_4' | 'GRADES_5' | 'GRADES_6_9' | 'GRADES_10_12' | 'AGES_10_11' | 'KINDERGARTEN_UNSPECIFIED'
export type NutritionGoal = 'BALANCED' | 'PROTEIN' | 'VEGETABLE' | 'CALCIUM'
export type FoodNutrients = { protein: number; fat: number; carbohydrate: number; fiber: number; calcium: number; iron: number }
export type FoodEntry = { name: string; nutrition: FoodNutrients; category: 'grain'|'protein'|'vegetable'|'fruit'|'dairy'|'fat'|'other'; allergens: string[] }
export type FoodInput = { name: string; amount: number; unit: 'g' | 'ml' }
export type MealSuggestion = { id: string; title: string; description: string; mealType: BoardingMealType; ageBands: SchoolAgeBand[]; ingredients: FoodInput[]; allergens: string[]; goals: NutritionGoal[] }
export const AGE_BANDS: { id: SchoolAgeBand; label: string; ages: string; dailyKcal: number }[] = [
  { id:'KINDERGARTEN_UNSPECIFIED', label:'Mầm non · cần quy chuẩn riêng', ages:'Mầm non (không áp dụng QĐ 3958)', dailyKcal:0 },
  { id:'GRADES_1_2', label:'Tiểu học · Lớp 1–2', ages:'6–7 tuổi', dailyKcal:1515 },
  { id:'GRADES_3_4', label:'Tiểu học · Lớp 3–4', ages:'8–9 tuổi', dailyKcal:1775 },
  { id:'GRADES_5', label:'Tiểu học · Lớp 5', ages:'10–11 tuổi', dailyKcal:2065 },
  // Nhóm kế thừa công thức cũ: nhắc đổi sang nhóm tuổi chính xác khi duyệt.
  { id:'GRADES_3_5', label:'Nhóm dữ liệu cũ · Lớp 3–5', ages:'Chưa tách 8–9 / 10–11 tuổi', dailyKcal:1775 },
  { id:'AGES_10_11', label:'THCS · 10–11 tuổi', ages:'10–11 tuổi', dailyKcal:2065 },
  { id:'GRADES_6_9', label:'THCS · 12–14 tuổi', ages:'12–14 tuổi', dailyKcal:2405 },
  { id:'GRADES_10_12', label:'THPT · 15–19 tuổi', ages:'15–19 tuổi', dailyKcal:2600 },
]
export const AGE_BAND_LABEL = (value: SchoolAgeBand) => AGE_BANDS.find(b => b.id === value)?.label ?? 'Chưa xác định nhóm tuổi'
/** Các nhóm theo Quyết định 3958/QĐ-BYT; không áp dụng bảng này cho mầm non. */
export const ageBandsForGrade = (grade: 'KINDERGARTEN'|'PRIMARY'|'SECONDARY'|'HIGH_SCHOOL'): SchoolAgeBand[] => {
  if (grade === 'PRIMARY') return ['GRADES_1_2', 'GRADES_3_4', 'GRADES_5']
  if (grade === 'SECONDARY') return ['AGES_10_11', 'GRADES_6_9']
  if (grade === 'HIGH_SCHOOL') return ['GRADES_10_12']
  return ['KINDERGARTEN_UNSPECIFIED']
}
export const defaultAgeBandForGrade = (grade: 'KINDERGARTEN'|'PRIMARY'|'SECONDARY'|'HIGH_SCHOOL'): SchoolAgeBand =>
  ageBandsForGrade(grade)[0] ?? 'GRADES_1_2'
/** Nguồn chính thức: Bộ Y tế, Quyết định 3958/QĐ-BYT (25/12/2025), Viện Dinh dưỡng Quốc gia. */
export const OFFICIAL_SCHOOL_NUTRITION_SOURCE = {
  title: 'Quyết định 3958/QĐ-BYT – Hướng dẫn dinh dưỡng đối với bữa ăn học đường',
  date: '25/12/2025', authority: 'Bộ Y tế',
  url: 'https://viendinhduong.vn/storage/app/uploads/public/2026/05/26/q_3958qbyt_huong_dan_dinh_duong_bua_an_hoc_uong.pdf',
  pages: 'Trang 2–5, Phụ lục 1 (trang 7)',
} as const

export const MEAL_ENERGY: Record<BoardingMealType, { min: number; max: number }> = {
  BREAKFAST: { min:0.25,max:0.30 }, LUNCH: { min:0.30,max:0.40 }, SNACK: { min:0.05,max:0.10 },
}
export const ALLERGENS = ['Sữa', 'Trứng', 'Cá', 'Đậu nành', 'Đậu phộng', 'Lúa mì', 'Tôm/cua'] as const
const nutrients = (protein:number, fat:number, carbohydrate:number, fiber:number, calcium:number, iron:number): FoodNutrients => ({ protein,fat,carbohydrate,fiber,calcium,iron })
const rows: [string, FoodNutrients, FoodEntry['category'], string[]][] = [
  ['Gạo thơm',nutrients(7.4,0.8,78.9,0.9,8,1.3),'grain',[]],
  ['Gạo tẻ',nutrients(7.4,0.8,78.9,0.9,8,1.3),'grain',[]],
  ['Cơm trắng',nutrients(2.7,0.3,28,0.4,10,0.2),'grain',[]],
  ['Bún tươi',nutrients(1.8,0.2,25.7,0.5,12,0.2),'grain',[]],
  ['Bánh mì',nutrients(9,3.2,49,2.4,95,3.5),'grain',['Lúa mì']],
  ['Khoai lang',nutrients(1.6,0.1,20.1,3,30,0.6),'grain',[]],
  ['Thịt gà',nutrients(20,6,0,0,12,1.0),'protein',[]],
  ['Thịt heo',nutrients(19,9,0,0,8,0.9),'protein',[]],
  ['Thịt bò',nutrients(20,7,0,0,12,2.1),'protein',[]],
  ['Cá phi lê',nutrients(19,3,0,0,18,0.6),'protein',['Cá']],
  ['Trứng gà',nutrients(12.6,10.6,1.1,0,56,1.8),'protein',['Trứng']],
  ['Đậu hũ',nutrients(8,4.8,1.9,0.3,145,1.6),'protein',['Đậu nành']],
  ['Đậu xanh',nutrients(23,1.2,62,16,132,4.7),'protein',[]],
  ['Rau cải',nutrients(1.8,0.3,3.5,2.1,105,1.3),'vegetable',[]],
  ['Rau xanh',nutrients(1.8,0.3,3.5,2.1,105,1.3),'vegetable',[]],
  ['Rau ngót',nutrients(5.3,0.2,3.4,2.5,169,2.7),'vegetable',[]],
  ['Bông cải xanh',nutrients(2.8,0.4,6.6,2.6,47,0.7),'vegetable',[]],
  ['Cà rốt',nutrients(0.9,0.2,9.6,2.8,33,0.3),'vegetable',[]],
  ['Bí đỏ',nutrients(1,0.1,6.5,0.5,21,0.8),'vegetable',[]],
  ['Cà chua',nutrients(0.9,0.2,3.9,1.2,10,0.3),'vegetable',[]],
  ['Chuối',nutrients(1.1,0.3,22.8,2.6,5,0.3),'fruit',[]],
  ['Cam',nutrients(0.9,0.1,11.8,2.4,40,0.1),'fruit',[]],
  ['Sữa tươi',nutrients(3.2,3.3,4.8,0,113,0.03),'dairy',['Sữa']],
  ['Sữa chua',nutrients(3.5,3.3,4.7,0,121,0.1),'dairy',['Sữa']],
  ['Dầu thực vật',nutrients(0,100,0,0,0,0),'fat',[]],
  ['Hành lá',nutrients(1.8,0.2,7.3,2.6,72,1.5),'vegetable',[]],
]
export const FOOD_REFERENCE: FoodEntry[] = rows.map(([name,nutrition,category,allergens])=>({name,nutrition,category,allergens}))
const ascii = (name:string) => name.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim()
const aliases:Record<string,string> = {
  'gao': 'Gạo thơm', 'gao trang':'Gạo thơm', 'com':'Cơm trắng', 'rau luoc':'Rau cải',
  'ca':'Cá phi lê', 'ca thu':'Cá phi lê', 'trung':'Trứng gà', 'dau phu':'Đậu hũ', 'dau hu':'Đậu hũ',
  'thit lon':'Thịt heo', 'sua':'Sữa tươi', 'sua tiet trung':'Sữa tươi', 'dau an':'Dầu thực vật',
}
export const findFood = (name:string): FoodEntry | undefined => {
  const key=ascii(name)
  return FOOD_REFERENCE.find(food=>ascii(food.name)===key) || FOOD_REFERENCE.find(food=>food.name===aliases[key])
}
const round = (value:number) => Math.round(value*10)/10
export function analyzeRecipe(ingredients:FoodInput[],ageBand:SchoolAgeBand,meal:BoardingMealType){
  const totals={ protein:0,fat:0,carbohydrate:0,fiber:0,calcium:0,iron:0 }
  const matched: {name:string;amount:number;energy:number;protein:number;fat:number;carbohydrate:number}[]=[]
  const missing:string[]=[]
  const allergens=new Set<string>()
  let vegGrams=0
  let validCount=0
  for(const item of ingredients){
    if(!Number.isFinite(item.amount)||item.amount<=0||!item.name.trim())continue
    validCount++
    const food=findFood(item.name)
    if(!food){missing.push(item.name);continue}
    if(item.unit==='ml' && !['Sữa tươi','Sữa chua'].includes(food.name)){missing.push(`${item.name} (cần hệ số quy đổi ml → g)`);continue}
    const rate=item.amount/100 // Quy đổi sữa 1ml ≈1g chỉ là hệ số demo; kết quả không được chứng nhận.
    for(const nutrient of Object.keys(totals) as (keyof FoodNutrients)[])totals[nutrient]+=food.nutrition[nutrient]*rate
    for(const allergen of food.allergens)allergens.add(allergen)
    if(food.category==='vegetable')vegGrams+=item.amount
    matched.push({name:item.name,amount:item.amount,energy:round((food.nutrition.protein*4+food.nutrition.fat*9+food.nutrition.carbohydrate*4)*rate),protein:round(food.nutrition.protein*rate),fat:round(food.nutrition.fat*rate),carbohydrate:round(food.nutrition.carbohydrate*rate)})
  }
  const energy=totals.protein*4+totals.fat*9+totals.carbohydrate*4
  const band=AGE_BANDS.find(b=>b.id===ageBand)??AGE_BANDS[0]!
  const energyTarget={min:round(band.dailyKcal*MEAL_ENERGY[meal].min),max:round(band.dailyKcal*MEAL_ENERGY[meal].max)}
  const ratios=energy>0 ? {protein:round(totals.protein*4/energy*100),fat:round(totals.fat*9/energy*100),carbohydrate:round(totals.carbohydrate*4/energy*100)}:null
  const isComplete=validCount>0 && missing.length===0
  const notes:string[]=[]
  if(!validCount)notes.push('Thêm thành phần và định lượng để bắt đầu phân tích.')
  if(missing.length)notes.push(`Chưa có dữ liệu thành phần cho: ${missing.join(', ')}. Kết quả mới là phần tính được, KHÔNG phải tổng khẩu phần.`)
  if(isComplete){
    if(energy<energyTarget.min)notes.push('Năng lượng thấp hơn khoảng tham chiếu của BỮA ĂN; kiểm tra xem đã nhập đầy đủ cơm, canh, món phụ và tráng miệng chưa.')
    if(energy>energyTarget.max)notes.push('Năng lượng vượt khoảng tham chiếu của BỮA ĂN; rà soát định lượng và dầu/mỡ.')
    if(ratios&&(ratios.protein<13||ratios.protein>20||ratios.fat<20||ratios.fat>30||ratios.carbohydrate<55||ratios.carbohydrate>65))notes.push('Tỷ lệ năng lượng Đạm/Béo/Bột đường khác khoảng tham khảo 13–20% / 20–30% / 55–65%.')
    if(meal!=='SNACK'&&vegGrams<(['GRADES_6_9','AGES_10_11','GRADES_10_12'].includes(ageBand)?100:80))notes.push('Bữa chính chưa ghi nhận đủ lượng rau tham khảo; bổ sung rau củ và kiểm tra khẩu phần tổng.')
  }
  if(ageBand==='GRADES_3_5') notes.push('Nhóm 3–5 là dữ liệu cũ: chọn riêng độ tuổi 8–9 hoặc 10–11 để tránh dùng sai nhu cầu năng lượng.')
  notes.push('Kết quả chỉ là ước tính DEMO từ dữ liệu thực phẩm phổ biến; chưa xác minh bảng thành phần chính thức, sống/chín, hao hụt, gia vị hoặc dị ứng cá nhân.')
  return { totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,round(v)])) as FoodNutrients,
    energy:round(energy), energyTarget,ratios,coverage:validCount?round(100*matched.length/validCount):0,
    matched,missing,vegGrams:round(vegGrams),allergens:[...allergens],notes,isComplete }
}
const common=(names:[string,number][]):FoodInput[]=>names.map(([name,amount])=>({name,amount,unit:'g'}))
export const SCHOOL_MEAL_SUGGESTIONS:MealSuggestion[]=[
  {id:'rice-chicken-veg',title:'Cơm gà rau củ và canh',description:'Cơm, thịt gà, rau và cà rốt; ít dầu, nêm nhạt.',mealType:'LUNCH',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Gạo tẻ máy',75],['Thịt gà ta',85],['Cải xanh',100],['Cà rốt',35],['Dầu đậu tương',8]]),allergens:[],goals:['BALANCED','VEGETABLE','PROTEIN']},
  {id:'rice-fish-veg',title:'Cơm cá phi lê sốt cà chua',description:'Cơm, cá gỡ xương kỹ, rau cải và cà chua.',mealType:'LUNCH',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Gạo tẻ máy',85],['Cá basa, phi lê',95],['Cà chua',55],['Cải xanh',110],['Dầu đậu tương',7]]),allergens:['Cá'],goals:['BALANCED','PROTEIN','VEGETABLE']},
  {id:'rice-tofu-veg',title:'Cơm đậu hũ và bông cải',description:'Bữa trưa có nguồn đạm thực vật, rau phong phú.',mealType:'LUNCH',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Gạo tẻ máy',85],['Đậu phụ',160],['Súp lơ xanh',95],['Cà rốt',40],['Dầu đậu tương',9]]),allergens:['Đậu nành'],goals:['BALANCED','VEGETABLE']},
  {id:'rice-beef-veg',title:'Cơm bò xào rau củ',description:'Thịt bò, cơm và hai loại rau củ.',mealType:'LUNCH',ageBands:['GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Gạo tẻ máy',90],['Thịt bò, lưng, nạc',100],['Cải xanh',115],['Cà rốt',50],['Dầu đậu tương',9]]),allergens:[],goals:['PROTEIN','BALANCED']},
  {id:'porridge-chicken',title:'Cháo gà cà rốt',description:'Món sáng mềm, bổ sung thịt và rau củ.',mealType:'BREAKFAST',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Gạo tẻ máy',70],['Thịt gà ta',70],['Cà rốt',45],['Dầu đậu tương',6]]),allergens:[],goals:['BALANCED','PROTEIN']},
  {id:'bread-egg-milk',title:'Bánh mì trứng và sữa',description:'Bữa sáng dễ chuẩn bị; cần đối chiếu dị ứng.',mealType:'BREAKFAST',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Bánh mỳ',90],['Trứng gà ta',60],['Sữa bò tươi',180],['Cà rốt',30]]),allergens:['Lúa mì','Trứng','Sữa'],goals:['CALCIUM','PROTEIN']},
  {id:'bun-pork-veg',title:'Bún thịt heo rau cải',description:'Bún, thịt và rau với nước dùng nhạt.',mealType:'BREAKFAST',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Bún tươi',200],['Thịt lợn nạc',75],['Cải xanh',80],['Dầu đậu tương',5]]),allergens:[],goals:['BALANCED','VEGETABLE']},
  {id:'snack-yogurt-banana',title:'Sữa chua và chuối',description:'Bữa xế đơn giản, ưu tiên sữa ít đường.',mealType:'SNACK',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Sữa chua',110],['Chuối tiêu',65]]),allergens:['Sữa'],goals:['CALCIUM','BALANCED']},
  {id:'snack-sweet-potato',title:'Khoai lang và sữa',description:'Bữa xế có chất xơ, sữa bổ sung canxi.',mealType:'SNACK',ageBands:['GRADES_1_2','GRADES_3_4','GRADES_5','GRADES_3_5','AGES_10_11','GRADES_6_9','GRADES_10_12'],ingredients:common([['Khoai lang',80],['Sữa bò tươi',85]]),allergens:['Sữa'],goals:['VEGETABLE','CALCIUM']},
]
export function suggestMeals(meal:BoardingMealType,band:SchoolAgeBand,goal:NutritionGoal,avoid:string[]){
  // Hệ số gợi ý khẩu phần minh họa, KHÔNG phải mức kê đơn hay định lượng bắt buộc.
  // Nhu cầu thực tế thay đổi theo tuổi, giới, hoạt động và số bữa trong ngày.
  const scaling:Record<SchoolAgeBand,number>={GRADES_1_2:0.8,GRADES_3_4:1,GRADES_5:1.13,GRADES_3_5:1,AGES_10_11:1.13,GRADES_6_9:1.25,GRADES_10_12:1.4,KINDERGARTEN_UNSPECIFIED:0.7}
  return SCHOOL_MEAL_SUGGESTIONS.filter(item=>item.mealType===meal && item.ageBands.includes(band) && !item.allergens.some(a=>avoid.includes(a)))
    .sort((a,b)=>Number(b.goals.includes(goal))-Number(a.goals.includes(goal)))
    .slice(0,4)
    .map(item=>({...item,ingredients:item.ingredients.map(food=>({...food,amount:Math.round(food.amount*scaling[band]*10)/10}))}))
}
