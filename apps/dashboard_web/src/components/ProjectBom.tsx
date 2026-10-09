import BuildPartModel from './BuildPartModel';
import {useBuildStringDraft} from '../lib/buildFormDraft';
import BuildDraftNotice from './BuildDraftNotice';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import BuildStockActions from './BuildStockActions';
import CadPartMetadata,{type CadMetadata} from './CadPartMetadata';
import BuildDemandReview from './BuildDemandReview';
import BuildRevisionComparison from './BuildRevisionComparison';
import BuildSourceFreshness from './BuildSourceFreshness';
import BuildChangeImpact from './BuildChangeImpact';
import BuildChangeDecisions from './BuildChangeDecisions';
import {readBuildPages} from '../lib/robotBuildWorkspace';
type Bom={id:string;name:string;snapshot_id:string|null;owner_id:string;revision:number;shared_at:string|null;created_at:string};
type Line={id:string;bom_id:string;name:string;design_quantity:number;required_quantity:number;disposition:string;inventory_id:string|null;job_id:string|null;review_note:string;revision:number;occurrence_paths?:string[][];source_identity?:{partId?:string;kind?:string;provenance?:string;metadata?:CadMetadata}};
type Stock={id:string;name:string;quantity:number;unit:string};
export default function ProjectBom({projectId,canManage,canStock,canBuy,jobs,onChanged,compact=false,confirmDiscard=async()=>true}:{projectId:string;canManage:boolean;canStock:boolean;canBuy:boolean;jobs:{id:string;task_id?:string;part_name:string;required_quantity:number}[];onChanged:()=>Promise<void>;compact?:boolean;confirmDiscard?:()=>Promise<boolean>}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [boms,setBoms]=useState<Bom[]>([]),[lines,setLines]=useState<Line[]>([]),[stock,setStock]=useState<Stock[]>([]),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [search,setSearch]=useState(''),[limit,setLimit]=useState(50),[selectedLine,setSelectedLine]=useState<string|null>(null);
 const generation=useRef(0);
 const dispositions:Record<string,[string,string]>={review:['Needs review','דרושה סקירה'],make:['Make','ייצור'],buy:['Buy','רכש'],reuse:['Reuse','שימוש חוזר'],exclude:['Excluded','לא נדרש']};
 async function load(){const token=++generation.current;setLoading(true);try{
  const b=await readBuildPages<Bom>((a,z)=>supabase.from('robot_build_boms').select('*').eq('project_id',projectId).order('id').range(a,z));
  const all:Line[]=[];for(let start=0;start<b.length;start+=100){all.push(...await readBuildPages<Line>((a,z)=>supabase.from('robot_build_bom_lines').select('*').in('bom_id',b.slice(start,start+100).map(b=>b.id)).order('id').range(a,z)));}
  const s=await readBuildPages<Stock>((a,z)=>supabase.from('frc_parts_inventory').select('id,name,quantity,unit').eq('archived',false).eq('unit','pcs').order('id').range(a,z));
  if(token!==generation.current)return;setBoms(b.sort((a,z)=>z.created_at.localeCompare(a.created_at)));setLines(all);setStock(s.sort((a,z)=>a.name.localeCompare(z.name)));setMessage('');
 }catch{if(token===generation.current){setBoms([]);setLines([]);setStock([]);setMessage(pick('Parts review could not be loaded.','לא ניתן לטעון את סקירת החלקים.'));}}finally{if(token===generation.current)setLoading(false);}}
 useEffect(()=>{setBoms([]);setLines([]);setSelectedLine(null);void load();return()=>{generation.current++;};},[projectId]);
 return <section aria-label={pick('Project parts review','סקירת חלקי הפרויקט')}><h3>{pick('Parts to make, buy or reuse','חלקים לייצור, לרכש או לשימוש חוזר')}</h3><p role="status">{loading?pick('Loading parts…','טוען חלקים…'):message}</p>
 {canManage&&<ManualRequirement projectId={projectId} saved={load}/>}
 {!loading&&<BuildSourceFreshness key={projectId} boms={boms}/>}
 {!loading&&<BuildRevisionComparison key={projectId} boms={boms} lines={lines} onSelect={async id=>{if(await confirmDiscard()){setSearch('');setLimit(50);setSelectedLine(id);requestAnimationFrame(()=>document.getElementById(`build-part-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'}));}}}/>}
 {!!lines.length&&<label>{pick('Find a part','חיפוש חלק')}<input type="search" value={search} onChange={async e=>{const value=e.target.value;if(await confirmDiscard()){setSearch(value);setLimit(50);}}}/></label>}
 {!loading&&!boms.length&&!message&&<p>{pick('Import an assembly draft from CAD Mentor → Assembly parts. Existing tasks can be used independently.','יבאו טיוטת הרכבה ממנטור CAD ← חלקי ההרכבה. ניתן להשתמש במשימות הקיימות בנפרד.')} <a href="/engineering/cad">{pick('Open CAD Mentor','פתיחת מנטור CAD')}</a></p>}
 {message&&<button onClick={()=>void load()}>{pick('Retry','ניסיון חוזר')}</button>}
 {boms.map(b=><details key={b.id} open={compact||lines.some(l=>l.bom_id===b.id&&l.id===selectedLine)?true:undefined}><summary>{b.snapshot_id?b.name:pick('Workshop requirements','דרישות הסדנה')} · {b.shared_at?pick('Shared project list','רשימה משותפת בפרויקט'):pick('Private draft','טיוטה פרטית')} · {new Date(b.created_at).toLocaleDateString(pick("en-GB","he-IL"),{day:"numeric",month:"short",year:"numeric"})}</summary>
  <p>{pick('Each import remains a separate revision. Lists are not added together automatically; review overlapping assemblies and purchased subassemblies before creating work.','כל ייבוא נשמר כגרסה נפרדת. הרשימות אינן מחוברות אוטומטית; בדקו הרכבות חופפות ומכלולים קנויים לפני יצירת עבודה.')}</p>
  {!b.shared_at&&b.owner_id===profile?.id&&<div><p>{pick('Sharing exposes this parts list, source identifiers and review notes to members who can view this project. It does not share CAD geometry or AI reviews.','השיתוף חושף את רשימת החלקים, מזהי המקור והערות הסקירה לחברים שיכולים לצפות בפרויקט. הוא אינו משתף גאומטריה או סקירות AI.')}</p><button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await supabase.rpc('share_robot_build_bom',{p_bom:b.id,p_expected:b.revision});if(r.error)throw Error(r.error.message);await load();}catch(e){setMessage(e instanceof Error?e.message:pick('Sharing failed.','השיתוף נכשל.'));}finally{setBusy(false);}}}>{pick('Share this parts list with project members','שיתוף רשימת החלקים עם חברי הפרויקט')}</button></div>}
  {compact&&<div className="build-parts-table" role="table" aria-label={pick('Parts list','רשימת חלקים')}><div className="build-parts-row build-parts-heading" role="row"><span role="columnheader">{pick('Part','חלק')}</span><span role="columnheader">{pick('Required','נדרש')}</span><span role="columnheader">{pick('Sourcing','מקור')}</span></div>{lines.filter(l=>l.bom_id===b.id&&l.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,limit).map(l=><div role="row" className="build-parts-row" key={l.id}><span role="cell"><button type="button" aria-expanded={selectedLine===l.id} onClick={async()=>{if(await confirmDiscard())setSelectedLine(selectedLine===l.id?null:l.id);}}>{l.name}</button></span><span role="cell">{l.required_quantity} {pick('pcs','יח׳')}</span><span role="cell">{pick(...dispositions[l.disposition])}</span></div>)}</div>}
  {lines.filter(l=>l.bom_id===b.id&&l.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).filter((l,i)=>compact?l.id===selectedLine:i<limit||l.id===selectedLine).map(l=><LineEditor key={l.id} snapshotId={b.snapshot_id} projectId={projectId} line={l} candidates={lines} stock={stock} jobs={jobs} editable={canManage} canStock={canStock} canBuy={canBuy} shared={!!b.shared_at} saved={async()=>{await load();await onChanged();}}/>)}
  {lines.filter(l=>l.bom_id===b.id&&l.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).length>limit&&<button onClick={()=>setLimit(n=>n+50)}>{pick('Show 50 more parts','הצגת 50 חלקים נוספים')}</button>}
 </details>)}</section>;
}
function LineEditor({snapshotId,projectId,line:l,candidates,stock,jobs,editable,canStock,canBuy,shared,saved}:{snapshotId:string|null;projectId:string;line:Line;candidates:Line[];stock:Stock[];jobs:{id:string;task_id?:string;part_name:string;required_quantity:number}[];editable:boolean;canStock:boolean;canBuy:boolean;shared:boolean;saved:()=>Promise<void>}){
 const {pick}=useLocalization();
 const initial=()=>({disposition:l.disposition,qty:String(l.required_quantity),inventory:l.inventory_id??'',note:l.review_note,expected:String(l.revision)});
 const draft=useBuildStringDraft(`line-review:${l.id}`,initial,l.revision);const {disposition,qty,inventory,note}=draft.value;
 const linkInitial=()=>({job:'',expected:String(l.revision)});const link=useBuildStringDraft(`line-job:${l.id}`,linkInitial,l.revision);const {job}=link.value;
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const setDisposition=(disposition:string)=>draft.change({disposition}),setQty=(qty:string)=>draft.change({qty}),setInventory=(inventory:string)=>draft.change({inventory}),setNote=(note:string)=>draft.change({note}),setJob=(job:string)=>link.change({job});
 const labels:Record<string,[string,string]>={review:['Needs review','דרושה סקירה'],make:['Make','ייצור'],buy:['Buy','רכש'],reuse:['Reuse','שימוש חוזר'],exclude:['Exclude','לא נדרש']};
 const item=stock.find(s=>s.id===l.inventory_id);
 return <article id={`build-part-${l.id}`} className="build-job"><div className="build-job-summary"><strong>{l.name}</strong><span>{pick(...labels[l.disposition])} · {l.required_quantity}</span></div><small>{l.source_identity?.kind==='manual'?pick('Originally requested','כמות מקורית שהתבקשה'):pick('Imported quantity','כמות שיובאה')}: {l.design_quantity}</small>
 {l.source_identity?.kind!=='manual'&&<CadPartMetadata value={l.source_identity?.metadata}/>}
 <BuildPartModel snapshotId={snapshotId} paths={l.occurrence_paths} partId={l.source_identity?.partId}/>
 <BuildChangeImpact lineId={l.id} jobId={l.job_id} projectId={projectId}/><BuildChangeDecisions projectId={projectId} line={l} candidates={candidates} editable={editable}/>
 {l.source_identity?.provenance&&<p>{pick('Source / reason','מקור / סיבה')}: {l.source_identity.provenance}</p>}
 {editable&&<BuildDemandReview line={l.id} bom={l.bom_id} revision={l.revision} candidates={candidates} saved={saved}/>}
 {item&&<p>{item.name} · {pick('Physical stock','מלאי פיזי')}: {item.quantity} {item.unit} · {pick('Availability must account for other reservations.','יש להתחשב בהקצאות אחרות לפני קביעת זמינות.')}</p>}
 {editable&&!l.job_id&&<details><summary>{pick('Review quantity & sourcing','בדיקת כמות ומקור')}</summary><form data-build-form={draft.id} onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r=await supabase.rpc('review_robot_build_line',{p_line:l.id,p_expected:Number(draft.value.expected),p_disposition:disposition,p_quantity:Number(qty),p_inventory:inventory||null,p_note:note});if(r.error)throw Error(r.error.message);draft.saved({...draft.value,expected:String(Number(draft.value.expected)+1)});await saved();}catch(e){setMessage(e instanceof Error?e.message:pick('Save not confirmed.','השמירה לא אושרה.'));}finally{setBusy(false);}}}><BuildDraftNotice {...draft}/><fieldset disabled={busy}>
 <label>{pick('Source','מקור')}<select required value={disposition} onChange={e=>{setDisposition(e.target.value);if(e.target.value==='exclude')setQty('0');}}>{Object.entries(labels).map(([id,label])=><option key={id} disabled={id==='review'} value={id}>{pick(...label)}</option>)}</select></label>
 <label>{pick('Required quantity','כמות נדרשת')}<input type="number" min={0} max={100000} step={1} required value={qty} onChange={e=>setQty(e.target.value)}/></label>
 <label>{pick('Confirmed inventory match','התאמה מאושרת למלאי')}<select value={inventory} onChange={e=>setInventory(e.target.value)}><option value="">{pick('Not matched','ללא התאמה')}</option>{stock.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>{pick('Decision / quantity explanation','הסבר להחלטה ולכמות')}<textarea required minLength={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><button>{pick('Save review','שמירת הסקירה')}</button></fieldset></form></details>}
 {editable&&shared&&l.disposition==='make'&&!l.job_id&&<form data-build-form={link.id} onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r=await supabase.rpc('link_robot_build_line',{p_line:l.id,p_expected:Number(link.value.expected),p_job:job});if(r.error)throw Error(r.error.message);link.saved(linkInitial());await saved();}catch(e){setMessage(e instanceof Error?e.message:pick('Link not confirmed.','הקישור לא אושר.'));}finally{setBusy(false);}}}><label>{pick('Manufacturing job with matching quantity','עבודת ייצור בכמות תואמת')}<select required value={job} onChange={e=>setJob(e.target.value)}><option value="">{pick('Choose reviewed job','בחירת עבודה שנבדקה')}</option>{jobs.filter(j=>j.required_quantity===l.required_quantity).map(j=><option key={j.id} value={j.id}>{j.part_name}</option>)}</select></label><button disabled={busy||!job}>{pick('Link manufacturing job','קישור עבודת הייצור')}</button></form>}
 {shared&&['buy','reuse'].includes(l.disposition)&&l.inventory_id&&<BuildStockActions lineId={l.id} inventoryId={l.inventory_id} canStock={editable&&canStock} canBuy={editable&&canBuy&&l.disposition==='buy'}/>}
 {l.job_id&&<p><a href={`/robot-build?project=${projectId}&view=work&queue=team&task=${jobs.find(j=>j.id===l.job_id)?.task_id??''}`}>{pick('Open linked manufacturing job','פתיחת עבודת הייצור המקושרת')}</a> · {pick('Linked to manufacturing. This reviewed line is retained unchanged.','מקושר לייצור. השורה שנבדקה נשמרת ללא שינוי.')}</p>}<p role="status">{message}</p></article>;
}
function ManualRequirement({projectId,saved}:{projectId:string;saved:()=>Promise<void>}){
 const {pick}=useLocalization();const initial=()=>({name:'',quantity:'1',source:'',request:crypto.randomUUID()});const draft=useBuildStringDraft(`manual-requirement:${projectId}`,initial);const {name,quantity,source,request}=draft.value;
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const setName=(name:string)=>draft.change({name}),setQuantity=(quantity:string)=>draft.change({quantity}),setSource=(source:string)=>draft.change({source}),setRequest=(request:ReturnType<typeof crypto.randomUUID>)=>draft.change({request});
 return <details><summary>{pick('Add a requirement not in CAD','הוספת דרישה שאינה ב-CAD')}</summary><p>{pick('Add wiring, hardware or other workshop requirements. The entry is shared with this project and still needs a sourcing review. Quantities are pieces; material consumption is tracked separately.','הוסיפו חיווט, מחברים או דרישות אחרות לסדנה. הרשומה תשותף עם הפרויקט ועדיין תדרוש בדיקת מקור. הכמויות הן ביחידות; צריכת חומר נרשמת בנפרד.')}</p><form data-build-form={draft.id} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('add_robot_build_requirement',{p_project:projectId,p_name:name,p_quantity:Number(quantity),p_source:source,p_request:request});if(r.error)throw Error(r.error.message);draft.saved(initial());await saved();setMessage(pick('Requirement added. Review its quantity and sourcing below.','הדרישה נוספה. בדקו להלן את הכמות והמקור.'));}catch(e){setMessage(e instanceof Error?e.message:pick('Save not confirmed. Retry unchanged values.','השמירה לא אושרה. נסו שוב ללא שינוי.'));}finally{setBusy(false);}}}><BuildDraftNotice {...draft}/><fieldset disabled={busy}>
 <label>{pick('Requirement name','שם הדרישה')}<input required maxLength={180} value={name} onChange={e=>{setName(e.target.value);setRequest(crypto.randomUUID());}}/></label>
 <label>{pick('Quantity (pieces)','כמות (יחידות)')}<input required type="number" min={1} max={100000} step={1} value={quantity} onChange={e=>{setQuantity(e.target.value);setRequest(crypto.randomUUID());}}/></label>
 <label>{pick('Source or reason','מקור או סיבה')}<textarea required minLength={3} maxLength={2000} value={source} onChange={e=>{setSource(e.target.value);setRequest(crypto.randomUUID());}}/></label>
 <button>{busy?pick('Saving…','שומר…'):pick('Add project requirement','הוספת דרישה לפרויקט')}</button></fieldset></form><p role="status">{message}</p></details>;
}
