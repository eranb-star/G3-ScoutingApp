import {useBuildStringDraft} from '../lib/buildFormDraft';
import BuildDraftNotice from './BuildDraftNotice';
import {useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
export default function BuildMaterialReservations({jobId,materials,stock,done,saved}:{jobId:string;materials:{id:string;part_id:string;unit:string;planned:number;consumed:number;reserved?:number;revision:number}[];stock:{id:string;name:string}[];done:boolean;saved:()=>Promise<void>}){
 const initial=()=>({material:'',action:'reserve',quantity:'',note:'',request:crypto.randomUUID()});
 const draft=useBuildStringDraft(`material-reservation:${jobId}`,initial);const {material,action,quantity,note,request}=draft.value;
 const setMaterial=(value:string)=>draft.change({material:value,request:crypto.randomUUID()});const setAction=(value:string)=>draft.change({action:value,request:crypto.randomUUID()});const setQuantity=(value:string)=>draft.change({quantity:value,request:crypto.randomUUID()});const setNote=(value:string)=>draft.change({note:value,request:crypto.randomUUID()});const setRequest=(value:ReturnType<typeof crypto.randomUUID>)=>draft.change({request:value});

 const {pick}=useLocalization();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const chosen=materials.find(m=>m.id===material);const renew=()=>setRequest(crypto.randomUUID());
 return <section><h4>{pick('Reserve raw material','הקצאת חומר גלם')}</h4><p>{pick('Reserve stock for this job before the workshop. Actual use consumes the reservation first. Releasing unused material makes it available to other builds and fundraising.','הקצו מלאי לעבודה לפני הסדנה. צריכה בפועל מנצלת תחילה את ההקצאה. שחרור חומר שלא נוצל הופך אותו לזמין לבניות אחרות ולגיוס כספים.')}</p>
 <form data-build-form={draft.id} onSubmit={async e=>{e.preventDefault();if(busy||!chosen)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('reserve_robot_build_material',{p_material:material,p_action:action,p_amount:Number(quantity),p_expected:chosen.revision,p_note:note,p_request:request});if(r.error)throw r.error;draft.saved(initial());await saved();setMessage(pick('Material allocation saved.','הקצאת החומר נשמרה.'));}catch(e){setMessage((e as {message?:string}).message??pick('Save not confirmed; retry unchanged values.','השמירה לא אושרה; נסו שוב ללא שינוי.'));}finally{setBusy(false);}}}>
 <fieldset disabled={busy}><BuildDraftNotice {...draft}/><label>{pick('Planned material','חומר מתוכנן')}<select required value={material} onChange={e=>{setMaterial(e.target.value);renew();}}><option value="">{pick('Choose material','בחירת חומר')}</option>{materials.map(m=><option value={m.id} key={m.id}>{stock.find(s=>s.id===m.part_id)?.name??m.part_id} · {m.unit}</option>)}</select></label>
 <label>{pick('Action','פעולה')}<select value={action} onChange={e=>{setAction(e.target.value);renew();}}><option value="reserve" disabled={done}>{pick('Reserve for this job','הקצאה לעבודה זו')}</option><option value="release">{pick('Release unused reservation','שחרור הקצאה שלא נוצלה')}</option></select></label>
 {chosen&&<p>{pick('Reserved for this job','מוקצה לעבודה זו')}: {chosen.reserved??0} {chosen.unit}</p>}
 <label>{pick('Quantity in inventory units','כמות ביחידות המלאי')}<input type="number" min="0.0001" step="0.0001" max="1000000" required value={quantity} onChange={e=>{setQuantity(e.target.value);renew();}}/></label><label>{pick('Reason','סיבה')}<textarea required minLength={3} maxLength={2000} value={note} onChange={e=>{setNote(e.target.value);renew();}}/></label><button disabled={!chosen||(done&&action==='reserve')}>{pick('Save allocation','שמירת הקצאה')}</button></fieldset><p role="status">{message}</p></form></section>;
}
