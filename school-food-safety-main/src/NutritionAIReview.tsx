import { useEffect, useRef } from 'react'
import { AlertCircle, BarChart3, BookOpenText, CheckCircle2, ClipboardList, ExternalLink, ShieldAlert, Sparkles, X } from 'lucide-react'
import type { BoardingDish } from './lib/boardingMenu'
import { AGE_BAND_LABEL, OFFICIAL_SCHOOL_NUTRITION_SOURCE, defaultAgeBandForGrade } from './lib/schoolNutrition'
import { analyzeOfficialRecipe, findOfficialFood } from './lib/officialFoodNutrition'
import './NutritionAIReview.css'

type CheckState = 'warning' | 'attention' | 'information'
const fmt = (num:number) => num.toLocaleString('vi-VN',{maximumFractionDigits:1})
const mealNames = {BREAKFAST:'Bữa sáng',LUNCH:'Bữa trưa',SNACK:'Bữa phụ chiều'} as const

/**
 * Trợ lý phân tích dựa trên quy tắc và nguồn pháp lý chính thức, không gọi mô hình AI ngoài.
 * Chỉ đối chiếu những dòng khớp tên Phụ lục 7 QĐ 3958/QĐ-BYT.
 * Khi kết nối backend cần dùng kiểm soát nguồn và phiên bản bảng thành phần, khối lượng ăn được,
 * phương pháp chế biến/hao hụt và một quy trình duyệt có chữ ký, audit log.
 */
export default function NutritionAIReview({dish,onClose}:{dish:BoardingDish;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{ref.current?.showModal()},[])
  const age=dish.ageBand??defaultAgeBandForGrade(dish.gradeLevel)
  const records=dish.ingredientRecords??[]
  const data=analyzeOfficialRecipe(records.map(item=>({name:item.name,unit:item.unit,amount:item.amountPerServing??0})),age,dish.mealType)
  const withoutAmount=records.filter(item=>item.amountPerServing==null||item.amountPerServing<=0).map(item=>item.name)
  const withoutFoodReference=records.filter(item=>item.amountPerServing!=null && item.amountPerServing>0 && !findOfficialFood(item.name)).map(item=>item.name)
  const missing=Array.from(new Set([...withoutAmount,...withoutFoodReference,...data.missing]))
  const hadNoRecords=records.length===0
  const isKindergarten=dish.gradeLevel==='KINDERGARTEN'
  const ratio=data.ratios
  const energyPercent=data.energyTarget.min>0?Math.round(data.energy/data.energyTarget.min*100):0
  const p=data.energy>0 && ratio ? [
    {label:'Đạm',value:ratio.protein,min:13,max:20},
    {label:'Béo',value:ratio.fat,min:20,max:30},
    {label:'Bột đường',value:ratio.carbohydrate,min:55,max:65},
  ]:[]
  const diagnostic:{label:string;description:string;state:CheckState}[]=[]
  if(isKindergarten) diagnostic.push({label:'Chưa có bộ ngưỡng cho mầm non',description:'Quyết định 3958/QĐ-BYT dành cho học sinh phổ thông. Không dùng chỉ tiêu phổ thông để đánh giá suất ăn mầm non.',state:'warning'})
  if(hadNoRecords||missing.length) diagnostic.push({label:'Thiếu dữ liệu định lượng',description:hadNoRecords?'Chưa có danh sách nguyên liệu và số gam ăn được.':'Chưa tính được: '+missing.join(', ')+'. Không được coi phần tính được là tổng suất ăn.',state:'warning'})
  if(data.allergens.length) diagnostic.push({label:'Dị nguyên cần kiểm tra',description:`Có thể chứa: ${data.allergens.join(', ')}. Danh sách chỉ dựa trên nguyên liệu đã đối chiếu; cần kiểm tra nhãn, chất phụ gia và nguy cơ nhiễm chéo.`,state:'attention'})
  if(age==='GRADES_3_5') diagnostic.push({label:'Nhóm tuổi chưa cụ thể',description:'Dữ liệu cũ gộp lớp 3–5, cần tách nhóm 8–9 và 10–11 tuổi trước khi áp dụng ngưỡng.',state:'warning'})
  if(!isKindergarten && data.isComplete && records.length>0) {
    if(data.energy<data.energyTarget.min) diagnostic.push({label:'Năng lượng dưới ngưỡng tham chiếu bữa',description:`Đã tính ${fmt(data.energy)} kcal, so với ${fmt(data.energyTarget.min)}–${fmt(data.energyTarget.max)} kcal. Nếu đây chỉ là một món của bữa ăn, cần cộng đủ món còn lại trước khi kết luận.`,state:'attention'})
    else if(data.energy>data.energyTarget.max) diagnostic.push({label:'Năng lượng vượt ngưỡng tham chiếu bữa',description:`Đã tính ${fmt(data.energy)} kcal, so với ${fmt(data.energyTarget.min)}–${fmt(data.energyTarget.max)} kcal. Kiểm tra đơn vị, trọng lượng, dầu mỡ và các món kèm.`,state:'attention'})
    else diagnostic.push({label:'Năng lượng ước tính nằm trong khoảng bữa',description:'Đã đối chiếu năng lượng của các nguyên liệu khớp chính xác với bảng Bộ Y tế. Tuy vậy, còn phải xác minh hao hụt khi chế biến, nước, dầu, gia vị và cộng toàn bữa.',state:'information'})
    p.filter(item=>item.value<item.min||item.value>item.max).forEach(item=>diagnostic.push({label:`Tỷ lệ ${item.label.toLocaleLowerCase('vi')} ngoài khoảng`,description:`Tính được ${fmt(item.value)}% năng lượng, so với khoảng tham chiếu ${item.min}–${item.max}%.`,state:'attention'}))
    if(dish.mealType!=='SNACK') {
      const lower=dish.gradeLevel==='PRIMARY'?80:100,upper=dish.gradeLevel==='PRIMARY'?120:150
      if(data.vegGrams<lower) diagnostic.push({label:'Rau củ ghi nhận chưa đủ',description:`Khoảng gợi ý cho cả bữa chính: ${lower}–${upper} g; mới ghi nhận ${fmt(data.vegGrams)} g rau trong công thức.`,state:'attention'})
      if(data.vegGrams>upper) diagnostic.push({label:'Rau củ nhiều hơn khoảng hướng dẫn',description:`Định lượng rau đã ghi nhận ${fmt(data.vegGrams)} g; kiểm tra khẩu phần thực tế so với khoảng ${lower}–${upper} g/bữa chính.`,state:'information'})
    }
  }
  if(!diagnostic.length) diagnostic.push({label:'Chưa thấy sai lệch định lượng rõ ràng',description:'Mọi chỉ số hiển thị chỉ là phần đối chiếu được theo nguồn chính thức; phải xác minh công thức và tổng hợp cả bữa.',state:'information'})
  return <dialog className="nutrition-ai-dialog" ref={ref} aria-label={`AI phân tích dinh dưỡng ${dish.name}`} onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="nutrition-ai-panel">
      <header className="nutrition-ai-header"><div className="nutrition-ai-icon"><Sparkles size={24}/></div><div><span>TRỢ LÝ AI DINH DƯỠNG HỌC ĐƯỜNG · ĐỐI CHIẾU QUY TẮC</span><h2>Phân tích định lượng món ăn</h2><p>{dish.name} · {mealNames[dish.mealType]} · {AGE_BAND_LABEL(age)}</p></div><button type="button" aria-label="Đóng phân tích dinh dưỡng" onClick={onClose}><X size={19}/></button></header>
      <div className="nutrition-ai-scroll">
        <div className="nutrition-ai-trust" role="status"><ShieldAlert size={21}/><div><strong>Chưa thể chứng nhận phù hợp về dinh dưỡng</strong><p>Ngưỡng và các thực phẩm khớp tên chính xác đã đối chiếu với <b>Quyết định 3958/QĐ-BYT, Phụ lục 7</b>. Nguyên liệu không có dữ liệu chính thức, khác dạng sống/chín hoặc chưa quy đổi về gam được báo thiếu, không tự ước đoán. Chức năng này là công cụ phân tích theo quy tắc, chưa kết nối mô hình AI trực tuyến và không cấp chứng nhận.</p></div></div>
        <div className="nutrition-ai-metrics"><div><span>Năng lượng tính được</span><strong>{hadNoRecords?'—':`${fmt(data.energy)} kcal${!data.isComplete?' (một phần)':''}`}</strong><small>Tổng từ những nguyên liệu có nguồn chính thức</small></div><div><span>Khoảng của cả bữa</span><strong>{isKindergarten?'Không áp dụng':`${fmt(data.energyTarget.min)}–${fmt(data.energyTarget.max)} kcal`}</strong><small>Trung bình nhu cầu nam/nữ, mức hoạt động vừa</small></div><div><span>Đối chiếu Phụ lục 7</span><strong>{fmt(data.coverage)}%</strong><small>{records.length} nguyên liệu kê khai · {missing.length} nguyên liệu còn thiếu/chưa khớp</small></div></div>
        <section className="nutrition-ai-section"><div className="nutrition-ai-section-title"><BarChart3 size={19}/><h3>Chỉ tiêu năng lượng và chất sinh năng lượng</h3></div><p>Đây là bảng đối chiếu <b>một công thức/khẩu phần nhập vào</b> với tham chiếu của <b>cả bữa ăn</b>. Nếu bữa gồm nhiều món, cần tổng hợp các món, không dùng kết quả riêng lẻ để kết luận.</p>
          <div className="nutrition-ai-grid">{([['protein','Protein','g'],['fat','Lipid','g'],['carbohydrate','Glucid','g'],['fiber','Chất xơ','g'],['calcium','Canxi','mg'],['iron','Sắt','mg']] as const).map(([key,label,unit])=><div key={key}><span>{label}</span><strong>{hadNoRecords?'—':`${fmt(data.totals[key])} ${unit}`}</strong></div>)}</div>
          {ratio && <div className="nutrition-ai-ratios"><h4>Tỷ lệ năng lượng tính được</h4>{p.map(item=><div key={item.label} className="nutrition-ai-ratio-row"><span>{item.label}</span><div><div style={{width:`${Math.min(100,item.value)}%`}} className={item.value<item.min||item.value>item.max?'outside':''}/></div><strong>{fmt(item.value)}%</strong><small>Mốc {item.min}–{item.max}%</small></div>)}</div>}
          {energyPercent>0&&!data.isComplete&&<p className="nutrition-ai-subnote">Khi thiếu nguyên liệu hoặc định lượng, các tỷ lệ trên chỉ tính trong phần đã khớp và không đại diện cho cả món hoặc cả bữa.</p>}
        </section>
        <section className="nutrition-ai-section"><div className="nutrition-ai-section-title"><BookOpenText size={19}/><h3>Chi tiết số liệu đã xác minh từ bảng Bộ Y tế</h3></div>
          <p>Chỉ nhận diện đúng tên thực phẩm trong Phụ lục 7, không tự gán các tên chung như “thịt gà”, “cá phi lê”, “cơm trắng” cho một loại nguyên liệu khác. Mỗi dòng là định lượng theo 100 g phần ăn được theo dạng ghi trong bảng, quy đổi tuyến tính theo gam đã nhập.</p>
          {!!data.matched.length ? <div className="nutrition-ai-food-table-wrap"><table className="nutrition-ai-food-table"><thead><tr><th>Nguyên liệu đối chiếu</th><th>Gam</th><th>Kcal</th><th>Đạm</th><th>Béo</th><th>Bột đường</th><th>Vị trí nguồn</th></tr></thead><tbody>{data.matched.map((entry,index)=><tr key={`${entry.name}-${index}`}><td>{entry.name!==entry.foodName?<><strong>{entry.foodName}</strong><small>Nhập: {entry.name}</small></>:<strong>{entry.foodName}</strong>}</td><td>{fmt(entry.amount)}</td><td>{fmt(entry.energy)}</td><td>{fmt(entry.protein)} g</td><td>{fmt(entry.fat)} g</td><td>{fmt(entry.carbohydrate)} g</td><td>Phụ lục 7 · dòng {entry.appendixRow}, tr. {entry.printedPage}</td></tr>)}</tbody></table></div> : <p className="nutrition-ai-subnote">Chưa có nguyên liệu nào trùng tên bảng tham chiếu. Bếp có thể chọn tên chính xác từ Phụ lục 7 và khai báo gam ăn được để hệ thống tính.</p>}
          {!!missing.length && <p className="nutrition-ai-unmatched"><strong>Chưa xác minh ({missing.length}):</strong> {missing.join(' · ')}. Các nguyên liệu này không được cộng vào tổng, vì vậy không được dùng kết quả một phần để chứng nhận dinh dưỡng.</p>}
          <p className="nutrition-ai-subnote">Tỷ lệ đạm/béo/bột đường tính theo hệ số 4–9–4 kcal/g, có thể sai khác nhẹ với tổng năng lượng công bố do phương pháp và làm tròn. Không quy đổi ml thành g nếu chưa có khối lượng riêng xác thực.</p>
        </section>
        <section className="nutrition-ai-section"><div className="nutrition-ai-section-title"><ClipboardList size={19}/><h3>Nhận định hỗ trợ Ban Giám hiệu</h3></div><div className="nutrition-ai-diagnostics">{diagnostic.map((entry,index)=><article className={entry.state} key={`${index}-${entry.label}`}>{entry.state==='information'?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}<div><strong>{entry.label}</strong><p>{entry.description}</p></div></article>)}</div><p className="nutrition-ai-subnote">Cần kiểm tra chất lượng thực phẩm, muối/đường, công thức nấu, lượng hao hụt, dị ứng và sức khỏe riêng của học sinh. Phụ lục 7 là bảng giá trị theo 100 g phần ăn được; chưa thể tự động chứng nhận một món ăn “phù hợp” nếu thiếu dữ liệu thực tế.</p></section>
        <section className="nutrition-ai-section"><div className="nutrition-ai-section-title"><BookOpenText size={19}/><h3>Văn bản chính thống & khả năng truy xuất</h3></div><div className="nutrition-ai-source"><strong>{OFFICIAL_SCHOOL_NUTRITION_SOURCE.title}</strong><span>Cơ quan ban hành: {OFFICIAL_SCHOOL_NUTRITION_SOURCE.authority} · {OFFICIAL_SCHOOL_NUTRITION_SOURCE.date}</span><span>Phạm vi kiểm tra: {OFFICIAL_SCHOOL_NUTRITION_SOURCE.pages}; bảng thực phẩm Phụ lục 7, trang in 11–14</span><a href={OFFICIAL_SCHOOL_NUTRITION_SOURCE.url} target="_blank" rel="noopener noreferrer">Mở PDF gốc trên Viện Dinh dưỡng Quốc gia <ExternalLink size={14}/></a></div><p>Áp dụng: bữa sáng 25–30%, bữa trưa 30–40%, bữa phụ chiều 5–10% nhu cầu năng lượng/ngày; protein 13–20%, lipid 20–30%, glucid 55–65%; rau bữa chính 80–120 g (tiểu học), 100–150 g (THCS/THPT).</p><p className="nutrition-ai-subnote">Nhu cầu cá nhân thay đổi theo tuổi, giới, mức vận động và tình trạng sức khỏe. Các số kcal trên là giá trị trung bình tham chiếu, không phải nhu cầu riêng của học sinh.</p></section>
        <div className="nutrition-ai-footer-note">Bộ đối chiếu được tích hợp cục bộ từ Phụ lục 7 của Bộ Y tế. Không gọi AI trực tuyến, không xác thực hồ sơ nguồn gốc, không kiểm chứng chế biến hoặc sức khỏe từng học sinh. BGH chỉ duyệt sau khi nhận đủ thông tin từ bếp và có đánh giá chuyên môn.</div>
      </div><footer className="nutrition-ai-actions"><button type="button" onClick={onClose}>Đóng phân tích</button></footer>
    </div>
  </dialog>
}
