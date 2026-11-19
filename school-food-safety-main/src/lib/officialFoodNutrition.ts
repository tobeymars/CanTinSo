/**
 * Cơ sở dữ liệu con được CHÉP ĐỐI CHIẾU từ Quyết định 3958/QĐ-BYT (25/12/2025),
 * Phụ lục 7: Thành phần dinh dưỡng một số thực phẩm thông dụng, các trang PDF 12–15
 * (trang in 11–14). Giá trị trên 100g phần ăn được của THỰC PHẨM ĐÚNG TÊN và dạng mô tả trong bảng.
 * Đây không phải toàn bộ CSDL; KHÔNG suy đoán cho thực phẩm/chế biến khác.
 * Đơn vị đầu vào bắt buộc là gam phần ăn được; không mặc định ml = g.
 * Không tự áp dụng hao hụt, năng lượng chế biến, gia vị hay yếu tố cá nhân.
 */
import { AGE_BANDS, MEAL_ENERGY, OFFICIAL_SCHOOL_NUTRITION_SOURCE } from './schoolNutrition'
import type { FoodInput, FoodNutrients, SchoolAgeBand } from './schoolNutrition'
import type { BoardingMealType } from './boardingMenu'

export type OfficialFoodEntry = {
  name: string
  alternateNames: string[]
  energyKcal: number
  nutrition: FoodNutrients
  category: 'grain'|'protein'|'vegetable'|'fruit'|'dairy'|'fat'
  allergens: string[]
  appendixRow: number
  printedPage: number
}
const n = (protein:number,fat:number,carbohydrate:number,fiber:number,calcium:number,iron:number):FoodNutrients => ({ protein,fat,carbohydrate,fiber,calcium,iron })
const food = (name:string,aliases:string[],energyKcal:number,nutrition:FoodNutrients,category:OfficialFoodEntry['category'],allergens:string[],appendixRow:number,printedPage:number):OfficialFoodEntry => ({name,alternateNames:aliases,energyKcal,nutrition,category,allergens,appendixRow,printedPage})
/** Giá trị của từng dòng được so với bản gốc PDF của Bộ Y tế, tuyệt đối không nội suy. */
export const OFFICIAL_FOOD_REFERENCE: OfficialFoodEntry[] = [
  food('Gạo tẻ máy',[],346,n(7.9,1.0,76.3,0.4,30,1.3),'grain',[],2,11),
  food('Bánh mỳ',['Bánh mì'],250,n(7.9,0.8,52.8,0.2,28,2),'grain',['Lúa mì'],6,11),
  food('Khoai lang',[],124,n(0.8,0.2,29.8,1.3,34,1),'grain',[],13,11),
  food('Đậu xanh',[],346,n(23.4,2.4,57.8,4.7,64,4.8),'protein',[],22,12),
  food('Đậu phụ',['Đậu hũ'],97,n(10.9,5.4,1.1,0.4,24,2.2),'protein',['Đậu nành'],25,12),
  food('Cà chua',[],24,n(0.6,0.23,4.77,0.8,12,1.4),'vegetable',[],30,12),
  food('Cà rốt',[],44,n(1.5,0.17,9.03,1.2,43,0.8),'vegetable',[],31,12),
  food('Súp lơ xanh',['Bông cải xanh'],39,n(2.95,0.3,6.08,3.2,33,0.73),'vegetable',[],48,12),
  food('Bí ngô',['Bí đỏ'],29,n(0.3,0.07,6.83,0.7,24,0.5),'vegetable',[],29,12),
  food('Cải bắp',[],36,n(1.8,0.09,6.91,1.6,48,1.1),'vegetable',[],32,12),
  food('Cải xanh',[],23,n(1.7,0.14,3.76,1.8,89,1.9),'vegetable',[],36,12),
  food('Chuối tiêu',[],100,n(1.5,0.2,23,0.8,8,0.6),'fruit',[],53,13),
  food('Cam',[],43,n(0.9,0.06,9.74,1.4,34,0.4),'fruit',[],51,13),
  food('Dầu đậu tương',[],900,n(0,100,0,0,0,0.02),'fat',['Đậu nành'],102,13),
  food('Thịt bò, lưng, nạc',[],121,n(23.07,3.16,0.1,0,23,1.63),'protein',[],103,13),
  food('Thịt lợn nạc',['Thịt heo nạc'],139,n(19,7,0,0,7,0.96),'protein',[],107,13),
  food('Thịt gà ta',[],199,n(20.3,13.1,0,0,12,1.5),'protein',[],105,13),
  food('Thịt gà công nghiệp, đùi',[],137,n(18,6.8,0.89,0,18,0.75),'protein',[],117,14),
  food('Cá basa, phi lê',[],67,n(9.7,0.8,5.32,0,34,0.2),'protein',['Cá'],131,14),
  food('Trứng gà ta',[],150,n(12.96,10.33,1.25,0,55,2.7),'protein',['Trứng'],132,14),
  food('Sữa bò tươi',[],74,n(3.9,4.4,4.8,0,120,0.1),'dairy',['Sữa'],135,14),
  food('Sữa chua',[],61,n(3.3,3.7,3.6,0,120,0.1),'dairy',['Sữa'],137,14),
  food('Cá thu',[],166,n(18.2,10.3,0,0,50,1.3),'protein',['Cá'],125,14),
]
const normalized = (s:string) => s.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[\s\u00a0]+/g,' ').trim()
export const findOfficialFood = (name:string) => OFFICIAL_FOOD_REFERENCE.find(row=>[row.name,...row.alternateNames].some(alias=>normalized(alias)===normalized(name)))
const round = (x:number) => Math.round(x*10)/10
export function analyzeOfficialRecipe(ingredients:FoodInput[],ageBand:SchoolAgeBand,meal:BoardingMealType) {
  const totals:FoodNutrients = {protein:0,fat:0,carbohydrate:0,fiber:0,calcium:0,iron:0}
  const matched: { name:string; foodName:string; amount:number;energy:number;protein:number;fat:number;carbohydrate:number;appendixRow:number;printedPage:number }[] = []
  const missing:string[]=[]
  const allergens=new Set<string>()
  let vegGrams=0,validCount=0,energy=0
  for(const input of ingredients){
    const name=input.name.trim()
    if(!name) continue
    validCount++
    if(!Number.isFinite(input.amount)||input.amount<=0){ missing.push(`${name} (chưa khai báo số gam hợp lệ)`);continue }
    if(input.unit!=='g'){missing.push(`${name} (đơn vị ${input.unit}; cần chuyển sang gam phần ăn được)`);continue}
    const ref=findOfficialFood(name)
    if(!ref){missing.push(`${name} (chưa đối chiếu chính xác Phụ lục 7)`);continue}
    const factor=input.amount/100
    energy+=ref.energyKcal*factor
    ;(Object.keys(totals) as (keyof FoodNutrients)[]).forEach(key=>{totals[key]+=ref.nutrition[key]*factor})
    if(ref.category==='vegetable') vegGrams+=input.amount
    ref.allergens.forEach(allergen=>allergens.add(allergen))
    matched.push({name,foodName:ref.name,amount:input.amount,energy:round(ref.energyKcal*factor),protein:round(ref.nutrition.protein*factor),fat:round(ref.nutrition.fat*factor),carbohydrate:round(ref.nutrition.carbohydrate*factor),appendixRow:ref.appendixRow,printedPage:ref.printedPage})
  }
  const macroEnergy=totals.protein*4+totals.fat*9+totals.carbohydrate*4
  const ratios=macroEnergy>0?{protein:round(totals.protein*4/macroEnergy*100),fat:round(totals.fat*9/macroEnergy*100),carbohydrate:round(totals.carbohydrate*4/macroEnergy*100)}:null
  const band=AGE_BANDS.find(item=>item.id===ageBand)
  const energyTarget={min:round((band?.dailyKcal??0)*MEAL_ENERGY[meal].min),max:round((band?.dailyKcal??0)*MEAL_ENERGY[meal].max)}
  const isComplete=validCount>0&&missing.length===0&&ageBand!=='GRADES_3_5'&&ageBand!=='KINDERGARTEN_UNSPECIFIED'
  const notes = [
    'Giá trị trên 100 g thực phẩm phần ăn được đúng dạng mô tả trong bảng, không mặc nhiên tương đương món đã chế biến. Khi dùng thực phẩm có xương/vỏ phải quy đổi phần ăn được trước.',
    'Năng lượng và dưỡng chất từ Phụ lục 7 của Quyết định 3958/QĐ-BYT. Chưa có hệ số chế biến, hao hụt, độ ẩm hay gia vị.',
    'Tỷ lệ đạm/béo/bột đường tính từ 4–9–4 kcal/g; có thể lệch đôi chút với năng lượng danh mục do làm tròn và cách xác định.',
    'Ngưỡng năng lượng là của cả bữa, không phải một món. Chỉ đưa ra đánh giá khi cộng đủ món của bữa và có chuyên gia xác nhận.',
    `Nguồn gốc: ${OFFICIAL_SCHOOL_NUTRITION_SOURCE.title}.`
  ]
  return { totals:Object.fromEntries(Object.entries(totals).map(([key,v])=>[key,round(v)])) as FoodNutrients, energy:round(energy),energyTarget,ratios,matched,missing,allergens:[...allergens],vegGrams:round(vegGrams),coverage:validCount?round(matched.length/validCount*100):0,notes,isComplete }
}
