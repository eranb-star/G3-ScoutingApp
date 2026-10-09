import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useAccessControl} from '../lib/accessControl';
import {readBuildPages} from '../lib/robotBuildWorkspace';
import './workshopResource.css';

type Resource={id:string;name:string;kind:string;active:boolean;busy:boolean};
type Claim={id:string;resource_id:string;created_at:string;note:string};
/** Shared availability only: this never reports manufacturing or consumes stock. */
export default function WorkshopResource({buildJob,fundraisingJob,editable,onChanged}:{buildJob?:string;fundraisingJob?:string;editable:boolean;onChanged?:()=>Promise<void>}){
 const {pick}=useLocalization(),access=useAccessControl();
 const [resources,setResources]=useState<Resource[]>([]),[claims,setClaims]=useState<Claim[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(''),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState(''),[note,setNote]=useState(''),[name,setName]=useState(''),[kind,setKind]=useState('printer'),[request,setRequest]=useState(()=>crypto.randomUUID());
 const [tools,setTools]=useState<{id:string;name:string}[]>([]);
 const generation=useRef(0);
 async function load(){const g=++generation.current;try{const [r,c,t]=await Promise.all([
  supabase.rpc('workshop_resource_availability'),
  readBuildPages<Claim>((a,z)=>supabase.from('workshop_resource_claims').select('id,resource_id,created_at,note').eq(buildJob?'build_job_id':'fundraising_job_id',buildJob??fundraisingJob!).is('released_at',null).order('id').range(a,z)),
  readBuildPages<{id:string;name:string}>((a,z)=>supabase.from('workshop_tools').select('id,name').eq('status','available').eq('amount',1).order('id').range(a,z))]);
  if(r.error)throw r.error;if(g===generation.current){setResources(r.data??[]);setClaims(c);setTools(t);setReady(true);}
 }catch{if(g===generation.current){setReady(false);setError(pick('Equipment availability could not be confirmed. Retry before reserving.','לא ניתן לאמת זמינות ציוד. נסו שוב לפני שמירה.'));}}}
 useEffect(()=>{setReady(false);setSelected('');setNote('');setReceipt('');setError('');void load();return()=>{generation.current++;};},[buildJob,fundraisingJob]);
 async function run(fn:()=>PromiseLike<{error:{message:string}|null}>,message:string){if(busy)return;setBusy(true);setError('');setReceipt('');try{const r=await fn();if(r.error)throw r.error;setNote('');setName('');setRequest(crypto.randomUUID());setReceipt(message);await load();await onChanged?.();}catch(e){setError((e as {message:string}).message);}finally{setBusy(false);}}
 const claim=claims[0];
 return <section className="workshop-resource" aria-label={pick('Shared equipment','ציוד משותף')}>
  <div className="workshop-resource-heading"><strong>{pick('Shared equipment','ציוד משותף')}</strong><button type="button" disabled={busy} onClick={()=>{setError('');void load();}}>{pick('Refresh availability','רענון זמינות')}</button></div>
  {error&&<p role="alert">{error}</p>}{receipt&&<p role="status">{receipt}</p>}
  {!ready&&!error&&<p role="status">{pick('Checking availability…','בודק זמינות…')}</p>}
  {ready&&<>{claim?<p><strong>{resources.find(r=>r.id===claim.resource_id)?.name??pick('Reserved equipment','ציוד שמור')}</strong> · {pick('Reserved for this job','שמור לעבודה זו')}<br/>{claim.note}</p>:<p>{pick('No equipment reserved for this job. Availability is shared with robot manufacturing and fundraising.','לא נשמר ציוד לעבודה זו. הזמינות משותפת לייצור הרובוט ולגיוס הכספים.')}</p>}
  {editable&&<form onSubmit={e=>{e.preventDefault();void run(()=>claim?supabase.rpc('release_workshop_resource',{p_claim:claim.id,p_note:note}):supabase.rpc('claim_workshop_resource',{p_resource:selected,p_build:buildJob??null,p_fundraising:fundraisingJob??null,p_note:note,p_request:request}),claim?pick('Equipment released. Work and stock records are unchanged.','הציוד שוחרר. רשומות העבודה והמלאי לא השתנו.'):pick('Equipment reserved for this job.','הציוד נשמר לעבודה זו.'));}}><fieldset disabled={busy}>
  {!claim&&<label>{pick('Equipment','ציוד')}<select required value={selected} onChange={e=>{setSelected(e.target.value);setRequest(crypto.randomUUID());}}><option value="">{pick('Choose available equipment','בחירת ציוד זמין')}</option>{resources.filter(r=>r.active&&(!fundraisingJob||r.kind==='printer')).map(r=><option key={r.id} value={r.id} disabled={r.busy}>{r.name}{r.busy?pick(' · In use / reserved',' · בשימוש / שמור'):''}</option>)}</select></label>}
  <label>{claim?pick('Release reason','סיבת שחרור'):pick('Planned operation','פעולה מתוכננת')}<input required minLength={3} maxLength={1000} value={note} onChange={e=>{setNote(e.target.value);setRequest(crypto.randomUUID());}}/></label>
  <button disabled={!claim&&!selected}>{claim?pick('Release equipment','שחרור ציוד'):pick('Reserve for this job','שמירה לעבודה זו')}</button></fieldset></form>}
  <p className="workshop-resource-help">{fundraisingJob?pick('With registered printers, reserve one before starting. Recording the print result releases it automatically. Existing material and cost reporting stays in this print job.','לאחר רישום מדפסות, שמרו מדפסת לפני התחלה. רישום תוצאת ההדפסה משחרר אותה אוטומטית. דיווח חומר ועלות נשאר בעבודת ההדפסה הזו.'):pick('Release equipment when the operation is finished. This reservation does not qualify an operator or complete an inspection.','שחררו את הציוד לאחר סיום הפעולה. שמירה זו אינה מסמיכה מפעיל ואינה משלימה בדיקה.')}</p>
  {access.can('manage_inventory')&&<details><summary>{pick('Register workshop equipment','רישום ציוד סדנה')}</summary><form onSubmit={e=>{e.preventDefault();void run(()=>supabase.rpc('register_workshop_resource',{p_tool:name,p_kind:kind,p_request:request}),pick('Equipment registered. Select it to reserve for this job.','הציוד נרשם. בחרו אותו לשמירה עבור עבודה זו.'));}}><fieldset disabled={busy}><label>{pick('Existing inventory equipment','ציוד קיים במלאי')}<select required value={name} onChange={e=>{setName(e.target.value);setRequest(crypto.randomUUID());}}><option value="">{pick('Choose individual equipment','בחירת פריט ציוד יחיד')}</option>{tools.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>{pick('Type','סוג')}<select value={kind} onChange={e=>{setKind(e.target.value);setRequest(crypto.randomUUID());}}><option value="printer">{pick('3D printer','מדפסת תלת־ממד')}</option><option value="machine">{pick('Machine','מכונה')}</option><option value="workstation">{pick('Workstation','עמדת עבודה')}</option></select></label><button>{pick('Register equipment','רישום ציוד')}</button></fieldset></form><Link to="/tools?tab=equipment">{pick('Add or manage equipment in inventory','הוספה או ניהול ציוד במלאי')}</Link></details>}</>}
 </section>;
}
