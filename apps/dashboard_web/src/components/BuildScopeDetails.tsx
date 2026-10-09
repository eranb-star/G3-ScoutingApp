import {useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {readBuildPages} from '../lib/robotBuildWorkspace';

type Scope={purpose:string;season:number|null;description:string;physical_asset_id:string|null;revision:number};
type Draft={purpose:string;season:string;description:string;asset:string;expected:number;request:string};
const purposes=[['season','Season robot','רובוט לעונה'],['offseason','Offseason development','פיתוח מחוץ לעונה'],['prototype','Prototype','אב־טיפוס'],['subsystem','Subsystem / mechanism','מערכת / מנגנון']];
function parse(raw:string|null):Draft|null{try{const d=JSON.parse(raw??'null');return d&&['purpose','season','description','asset','request'].every(k=>typeof d[k]==='string')&&Number.isInteger(d.expected)&&d.expected>=0&&purposes.some(p=>p[0]===d.purpose)?d:null;}catch{return null;}}
export default function BuildScopeDetails({projectId,editable,onSaved,onDirty}:{projectId:string;editable:boolean;onSaved:()=>void;onDirty:()=>void}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const key=`g3-build-scope-draft:${profile?.id}:${projectId}`;
 const dirtyCallback=useRef(onDirty);dirtyCallback.current=onDirty;
 const [scope,setScope]=useState<Scope|null>(null),[assets,setAssets]=useState<{id:string;name:string;serial:string}[]>([]);
 const [draft,setDraft]=useState<Draft>({purpose:'season',season:'',description:'',asset:'',expected:0,request:crypto.randomUUID()});
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;setLoading(true);setFailed(false);void (async()=>{try{
  const [result,items]=await Promise.all([supabase.from('robot_build_scopes').select('purpose,season,description,physical_asset_id,revision').eq('project_id',projectId).maybeSingle(),readBuildPages<{id:string;name:string;serial:string}>((a,z)=>supabase.from('project_physical_assets').select('id,name,serial').eq('project_id',projectId).order('id').range(a,z))]);
  if(result.error)throw result.error;if(!live)return;setScope(result.data);setAssets(items);
  let restored:Draft|null=null;try{restored=parse(sessionStorage.getItem(key));}catch{}
  setDraft(restored??{purpose:result.data?.purpose??'season',season:String(result.data?.season??''),description:result.data?.description??'',asset:result.data?.physical_asset_id??'',expected:result.data?.revision??0,request:crypto.randomUUID()});setDirty(!!restored);
  if(restored){dirtyCallback.current();setMessage(pick('Unsubmitted draft restored on this tab. Review it before saving.','טיוטה שלא נשלחה שוחזרה בלשונית זו. בדקו אותה לפני שמירה.'));}
 }catch{if(live)setFailed(true);}finally{if(live)setLoading(false);}})();return()=>{live=false;};},[projectId,key]);
 function change(patch:Partial<Draft>){const next={...draft,...patch,request:crypto.randomUUID()};setDraft(next);setDirty(true);try{sessionStorage.setItem(key,JSON.stringify(next));}catch{setMessage(pick('Draft storage is unavailable. Keep this form open until saved.','אחסון הטיוטה אינו זמין. השאירו את הטופס פתוח עד השמירה.'));}}
 if(loading)return <p role="status">{pick('Loading build details…','טוען פרטי בנייה…')}</p>;
 if(failed)return <p role="alert">{pick('Build details are unavailable. Existing parts and workshop records remain accessible. Reload before editing setup.','פרטי הבנייה אינם זמינים. החלקים ורשומות הסדנה הקיימים עדיין זמינים. טענו מחדש לפני עריכת ההגדרות.')}</p>;
 if(!editable)return <section><h3>{pick('Build scope','תחום הבנייה')}</h3>{scope?<><p>{pick(...(purposes.find(p=>p[0]===scope.purpose)?.slice(1) as [string,string]??['Build','בנייה']))}{scope.season?' · '+scope.season:''}</p><p>{scope.description}</p></>:<p>{pick('The team leader has not configured the build purpose yet.','מוביל/ת הצוות טרם הגדירו את מטרת הבנייה.')}</p>}</section>;
 return <form className="build-scope-form" onSubmit={async e=>{e.preventDefault();if(busy)return;if(!navigator.onLine){setMessage(pick('Offline. Draft retained; no server changes were made.','אין חיבור. הטיוטה נשמרה; לא בוצעו שינויים בשרת.'));return;}setBusy(true);setMessage('');try{
  const r=await supabase.rpc('save_robot_build_scope',{p_project:projectId,p_expected:draft.expected,p_purpose:draft.purpose,p_season:draft.season?Number(draft.season):null,p_description:draft.description,p_asset:draft.asset||null,p_request:draft.request});if(r.error)throw r.error;
  setScope({purpose:draft.purpose,season:draft.season?Number(draft.season):null,description:draft.description,physical_asset_id:draft.asset||null,revision:r.data});setDraft(d=>({...d,expected:r.data,request:crypto.randomUUID()}));setDirty(false);try{sessionStorage.removeItem(key);}catch{}setMessage(pick('Build details saved.','פרטי הבנייה נשמרו.'));onSaved();
 }catch(e){setMessage((e as {message?:string}).message??pick('Save not confirmed. Draft retained.','השמירה לא אושרה. הטיוטה נשמרה.'));}finally{setBusy(false);}}}>
  <h3>{pick('What are we building?','מה אנחנו בונים?')}</h3><fieldset disabled={busy}>
  <label>{pick('Purpose','מטרה')}<select value={draft.purpose} onChange={e=>change({purpose:e.target.value})}>{purposes.map(([v,en,he])=><option key={v} value={v}>{pick(en,he)}</option>)}</select></label>
  <label>{pick('Season year (optional)','שנת העונה (רשות)')}<input type="number" min={1992} max={2200} step={1} value={draft.season} onChange={e=>change({season:e.target.value})}/></label>
  <label>{pick('Scope and intended result','תחום העבודה והתוצאה הרצויה')}<textarea required minLength={3} maxLength={2000} value={draft.description} onChange={e=>change({description:e.target.value})}/></label>
  <label>{pick('Physical robot or prototype','רובוט פיזי או אב־טיפוס')}<select value={draft.asset} onChange={e=>change({asset:e.target.value})}><option value="">{pick('Not built yet / not linked','טרם נבנה / לא קושר')}</option>{assets.map(a=><option key={a.id} value={a.id}>{a.name} · {a.serial}</option>)}</select></label>
  <p>{pick('This describes the existing project. A physical asset is optional; registering one does not certify its assembly or tests.','תיאור זה שייך לפרויקט הקיים. נכס פיזי הוא אופציונלי; רישומו אינו מאשר הרכבה או בדיקות.')}</p>
  <button disabled={busy||(!dirty&&!!scope)}>{busy?pick('Saving…','שומר…'):pick('Save build details','שמירת פרטי הבנייה')}</button>
  </fieldset><p role="status">{message}</p>
 </form>;
}
