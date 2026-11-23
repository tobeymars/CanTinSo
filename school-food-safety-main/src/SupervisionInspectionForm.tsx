import type { SupervisionContext } from './lib/supervisionApi'
import './SupervisionInspectionForm.css'

export type InspectionKind = 'processing' | 'before_serving' | 'food_sample'
export type InspectionLine = {
  dishId:string;servings:string;
  ingredients:string;prepFinishedAt:string;cookedAt:string;
  workerHygiene:string;toolsHygiene:string;areaHygiene:string;sensory:string;disposition:string;
  platedAt:string;servedAt:string;utensils:string;
  foodType:string;amount:string;temperature:string;takenAt:string;container:string;sealCode:string;storedAt:string;sampledBy:string;qualityNote:string;
}
export type InspectionDraft = {inspector:string;location:string;checkedAt:string;dishes:InspectionLine[]}
export const isDetailedInspection=(value:unknown):value is {kind:InspectionKind;inspector:string;location:string;checkedAt:string;isPass:boolean;notApplicable?:boolean;reason?:string;dishes:(Record<string,unknown>&{dishId:string;dishName:string;servings:number})[]} =>
  !!value&&typeof value==='object'&&Array.isArray((value as {dishes?:unknown}).dishes)

const blankLine=(dishId:string,servings:number):InspectionLine=>({
  dishId,servings:servings>0?String(servings):'',ingredients:'',prepFinishedAt:'',cookedAt:'',
  workerHygiene:'',toolsHygiene:'',areaHygiene:'',sensory:'',disposition:'',
  platedAt:'',servedAt:'',utensils:'',
  foodType:'',amount:'',temperature:'',takenAt:'',container:'',sealCode:'',storedAt:'',sampledBy:'',qualityNote:'',
})
export function newInspectionDraft(menu:NonNullable<SupervisionContext['menu']>,previous?:unknown):InspectionDraft{
  const original=isDetailedInspection(previous)?previous:undefined
  return {
    inspector:typeof original?.inspector==='string'?original.inspector:'',
    location:typeof original?.location==='string'?original.location:'',
    checkedAt:typeof original?.checkedAt==='string'?original.checkedAt:'',
    dishes:menu.dishes.map(dish=>{
      const found=original?.dishes.find(line=>line.dishId===dish.id)
      const base=blankLine(dish.id,menu.servings)
      if(!found)return base
      return Object.fromEntries(Object.keys(base).map(key=>[key,key==='dishId'?dish.id:
        found[key]===undefined?'':String(found[key])])) as InspectionLine
    }),
  }
}
const criteria=[{id:'pass',label:'Đạt'},{id:'fail',label:'Không đạt'}]
const textOf=(item:Record<string,unknown>,key:string)=>String(item[key]??'')
const translate=(key:string)=>({
  workerHygiene:'Vệ sinh người chế biến',toolsHygiene:'Dụng cụ chế biến',areaHygiene:'Khu vực chế biến',
  sensory:'Cảm quan món ăn',utensils:'Dụng cụ chia/che đậy',
} as Record<string,string>)[key]??key

export function InspectionEditor({kind,menu,value,onChange}:{
  kind:InspectionKind;menu:NonNullable<SupervisionContext['menu']>;
  value:InspectionDraft;onChange:(next:InspectionDraft)=>void
}){
  const update=(key:'inspector'|'location'|'checkedAt',v:string)=>onChange({...value,[key]:v})
  const change=(dishId:string,field:keyof InspectionLine,v:string)=>onChange({...value,dishes:value.dishes.map(item=>item.dishId===dishId?{...item,[field]:v}:item)})
  const field=(dishId:string,key:keyof InspectionLine,label:string,props:{type?:string;placeholder?:string;min?:string;max?:string;step?:string}={})=>{
    const row=value.dishes.find(item=>item.dishId===dishId)
    return <label key={key}>{label} *
      <input required type={props.type??'text'} min={props.min} max={props.max} step={props.step} placeholder={props.placeholder} value={row?.[key]??''} onChange={e=>change(dishId,key,e.target.value)}/>
    </label>
  }
  const evaluation=(dishId:string,key:keyof InspectionLine,label:string)=>{
    const row=value.dishes.find(item=>item.dishId===dishId)
    return <fieldset className="sif-choice" key={key}><legend>{label} *</legend><div>
      {criteria.map(option=><label key={option.id}><input type="radio" name={dishId+'-'+key} value={option.id} required checked={row?.[key]===option.id} onChange={()=>change(dishId,key,option.id)}/>{option.label}</label>)}
    </div></fieldset>
  }
  return <fieldset className="sif-form">
    <legend>{kind==='processing'?'Mẫu số 2 · Kiểm tra khi chế biến':kind==='before_serving'?'Mẫu số 3 · Kiểm tra trước khi ăn':'Lưu mẫu thức ăn · Nhãn và sổ theo dõi mẫu'}</legend>
    <p className="muted">Món ăn lấy từ thực đơn đã duyệt. Vui lòng ghi nhận kết quả kiểm tra thực tế, không điền trước hoặc mặc định là Đạt.</p>
    <div className="sif-grid">
      <label>Người thực hiện kiểm tra / lưu mẫu *<input required maxLength={300} value={value.inspector} onChange={e=>update('inspector',e.target.value)} placeholder="Họ và tên"/></label>
      <label>Địa điểm kiểm tra / lưu mẫu *<input required maxLength={300} value={value.location} onChange={e=>update('location',e.target.value)} placeholder="Bếp / trường và khu vực"/></label>
      <label>Thời gian kiểm tra thực tế *<input required type="datetime-local" value={value.checkedAt} onChange={e=>update('checkedAt',e.target.value)}/></label>
    </div>
    {menu.dishes.length===0?<p className="error">Chưa có món trong thực đơn đã duyệt.</p>:menu.dishes.map((dish,i)=>{
      const item=value.dishes.find(row=>row.dishId===dish.id)
      if(!item)return null
      return <section className="sif-dish" key={dish.id}>
        <header><span className="sif-step">Món {i+1}</span><strong>{dish.name}</strong></header>
        <div className="sif-grid">
          {field(dish.id,'servings','Số suất ăn',{type:'number',min:'1',step:'1'})}
          {kind==='processing'&&<>
            {field(dish.id,'ingredients','Nguyên liệu chính (tên, số lượng)')}
            {field(dish.id,'prepFinishedAt','Thời gian sơ chế xong',{type:'datetime-local'})}
            {field(dish.id,'cookedAt','Thời gian chế biến xong',{type:'datetime-local'})}
          </>}
          {kind==='before_serving'&&<>
            {field(dish.id,'platedAt','Thời gian chia món xong',{type:'datetime-local'})}
            {field(dish.id,'servedAt','Thời gian bắt đầu ăn',{type:'datetime-local'})}
          </>}
          {kind==='food_sample'&&<>
            <label>Loại thức ăn *<select required value={item.foodType} onChange={e=>change(dish.id,'foodType',e.target.value)}><option value="">Chọn loại</option><option value="solid">Đặc / khô (g)</option><option value="liquid">Lỏng (ml)</option></select></label>
            {field(dish.id,'amount',item.foodType==='liquid'?'Lượng mẫu (ml, tối thiểu 150)':'Lượng mẫu (g, tối thiểu 100)',{type:'number',min:item.foodType==='liquid'?'150':'100',step:'any'})}
            {field(dish.id,'takenAt','Thời gian lấy mẫu',{type:'datetime-local'})}
            {field(dish.id,'temperature','Nhiệt độ bảo quản (°C)',{type:'number',min:'2',max:'8',step:'any'})}
            {field(dish.id,'container','Dụng cụ lưu mẫu',{placeholder:'Hộp sạch, kín nắp'})}
            {field(dish.id,'sealCode','Mã niêm phong / nhãn mẫu')}
            {field(dish.id,'storedAt','Vị trí lưu mẫu',{placeholder:'Tủ mẫu, ngăn, địa điểm'})}
            {field(dish.id,'sampledBy','Người lấy / lưu mẫu')}
            {field(dish.id,'qualityNote','Ghi chú tình trạng/chất lượng mẫu')}
          </>}
        </div>
        {kind!=='food_sample'&&<>
          <div className="sif-evaluations">
            {kind==='processing'?<>
              {evaluation(dish.id,'workerHygiene','Vệ sinh người chế biến')}
              {evaluation(dish.id,'toolsHygiene','Trang thiết bị, dụng cụ')}
              {evaluation(dish.id,'areaHygiene','Khu vực chế biến, phụ trợ')}
            </>:evaluation(dish.id,'utensils','Dụng cụ chia, chứa đựng, che đậy, bảo quản')}
            {evaluation(dish.id,'sensory','Cảm quan món ăn')}
          </div>
          <label>Biện pháp xử lý / ghi chú (ghi “Không có” nếu tất cả đạt) *
            <textarea required maxLength={1000} rows={2} value={item.disposition} onChange={e=>change(dish.id,'disposition',e.target.value)} placeholder="Ghi rõ biện pháp xử lý khi có chỉ tiêu không đạt…"/>
          </label>
          {([item.workerHygiene,item.toolsHygiene,item.areaHygiene,item.utensils,item.sensory].includes('fail'))&&<p className="sif-warning">Có chỉ tiêu Không đạt: BGH không thể xác nhận hồ sơ này là đạt. Phải xử lý và bổ sung kiểm tra.</p>}
        </>}
      </section>
    })}
    {kind==='food_sample'&&<p className="sif-guidance">Mỗi món có mẫu và niêm phong riêng. Bảo quản 2–8°C ít nhất 24 giờ; không tự hủy mẫu khi nghi ngờ ngộ độc hoặc có yêu cầu của cơ quan quản lý. Việc hủy mẫu là sự kiện riêng sau thời gian lưu.</p>}
  </fieldset>
}

export function InspectionReadout({inspection}:{inspection:unknown}){
  if(!isDetailedInspection(inspection))return <p className="sif-warning">Báo cáo theo mẫu cũ chưa có các tiêu chí kiểm thực chi tiết. Cần yêu cầu bổ sung trước khi xác nhận.</p>
  if(inspection.notApplicable)return <p className="sif-guidance">Bữa ăn đã duyệt dưới 30 suất; hồ sơ lưu mẫu được ghi nhận không bắt buộc áp dụng. Lý do: <strong>{inspection.reason}</strong></p>
  const keys=inspection.kind==='processing'?['ingredients','prepFinishedAt','cookedAt','workerHygiene','toolsHygiene','areaHygiene','sensory','disposition']:
    inspection.kind==='before_serving'?['platedAt','servedAt','utensils','sensory','disposition']:
    ['foodType','amount','temperature','takenAt','container','sealCode','storedAt','sampledBy','qualityNote']
  return <section className="sif-readout">
    <h3>Thông tin đối chiếu đã báo cáo</h3>
    <p>Người kiểm tra: <strong>{inspection.inspector}</strong> · Địa điểm: <strong>{inspection.location}</strong> · Thời gian: {inspection.checkedAt.replace('T',' ')}</p>
    {inspection.isPass===false&&<p className="sif-warning">Có kết quả Không đạt. Không được xác nhận hồ sơ này là đạt.</p>}
    {inspection.dishes.map((line,i)=><article key={line.dishId}>
      <strong>{i+1}. {line.dishName} · {line.servings} suất</strong>
      <dl>{keys.map(key=><div key={key}><dt>{({
        ingredients:'Nguyên liệu chính',prepFinishedAt:'Sơ chế xong',cookedAt:'Chế biến xong',
        platedAt:'Chia món xong',servedAt:'Bắt đầu ăn',disposition:'Xử lý / ghi chú',
        foodType:'Loại',amount:'Lượng mẫu',temperature:'Nhiệt độ (°C)',takenAt:'Lấy mẫu',
        container:'Dụng cụ',sealCode:'Niêm phong',storedAt:'Vị trí',sampledBy:'Người lưu',qualityNote:'Chất lượng',
      } as Record<string,string>)[key]??translate(key)}</dt>
      <dd>{key==='amount'?textOf(line,key)+' '+textOf(line,'unit'):key==='foodType'?(line[key]==='solid'?'Đặc/khô':'Lỏng'):line[key]==='pass'?'Đạt':line[key]==='fail'?'Không đạt':textOf(line,key)}</dd></div>)}</dl>
    </article>)}
  </section>
}
