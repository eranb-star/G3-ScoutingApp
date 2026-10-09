import {useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
type Check={bom_id:string;checked_at:string|null;current_microversion:string|null;pinned_microversion:string|null;reference_type:string|null;error:string|null};
type Bom={id:string;name:string;snapshot_id:string|null;owner_id:string};
/** Advisory source checks never update the imported BOM or a released drawing. */
export default function BuildSourceFreshness({boms}:{boms:Bom[]}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [checks,setChecks]=useState<Check[]>([]),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const trigger=useRef<()=>void>(()=>{});
 const imports=boms.filter(b=>b.snapshot_id),identity=imports.map(b=>b.id+':'+b.owner_id).sort().join(',');
 useEffect(()=>{
  let cancelled=false,running=false,lastAttempt=0;
  const sourceBoms=boms.filter(b=>b.snapshot_id);
  const hidden=()=>document.visibilityState==='hidden';
  async function refresh(force=false){
   if(cancelled||running||(!force&&Date.now()-lastAttempt<30000))return;
   lastAttempt=Date.now();running=true;setBusy(true);setFailed(false);
   try{
    if((force||!hidden())&&profile?.role==='admin')for(const bom of sourceBoms.filter(b=>b.owner_id===profile.id)){
     if(cancelled||(!force&&hidden()))break;
     const r=await supabase.functions.invoke('onshape-connector',{body:{action:'build-freshness',bomId:bom.id}});
     if(r.error||r.data?.error){if(!cancelled)setFailed(true);break;}
    }
    const rows:Check[]=[];
    for(let i=0;i<sourceBoms.length;i+=100){
     const r=await supabase.from('robot_build_source_checks').select('bom_id,checked_at,current_microversion,pinned_microversion,reference_type,error').in('bom_id',sourceBoms.slice(i,i+100).map(b=>b.id));
     if(r.error)throw r.error;rows.push(...(r.data??[]));
    }
    if(!cancelled)setChecks(rows);
   }catch{if(!cancelled)setFailed(true);}finally{running=false;if(!cancelled)setBusy(false);}
  }
  setChecks([]);trigger.current=()=>void refresh(true);void refresh();
  const wake=()=>{if(!hidden())void refresh();},timer=setInterval(wake,300000);
  window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
  return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);};
 },[identity,profile?.id,profile?.role]);
 if(!imports.length)return null;
 return <section aria-label={pick('CAD source freshness','עדכניות מקור CAD')} className="build-job">
  <div className="build-job-summary"><strong>{pick('CAD source freshness','עדכניות מקור CAD')}</strong><button type="button" disabled={busy} onClick={()=>trigger.current()}>{busy?pick('Checking…','בודק…'):pick('Check now','בדיקה כעת')}</button></div>
  <p>{pick('Checks on opening, returning and every 5 minutes while visible. Only the connected source owner can check Onshape; other members see the last saved result. Released work never changes automatically.','בדיקה בפתיחה, בחזרה ובכל 5 דקות כשהמסך מוצג. רק בעל חיבור המקור יכול לבדוק ב-Onshape; שאר החברים רואים את התוצאה האחרונה שנשמרה. עבודה ששוחררה אינה משתנה אוטומטית.')}</p>
  {failed&&<p role="status">{pick('Could not complete the latest check. Results below are last known, not confirmation that CAD is current.','הבדיקה האחרונה לא הושלמה. התוצאות להלן הן האחרונות הידועות ואינן אישור שה-CAD עדכני.')}</p>}
  <ul>{imports.map(b=>{const c=checks.find(c=>c.bom_id===b.id);return <li key={b.id}><strong>{b.name}</strong> — {!c?.checked_at?pick('Not checked','טרם נבדק'):c.error?pick('Latest check failed','הבדיקה האחרונה נכשלה'):c.reference_type!=='w'?pick('Fixed CAD reference; does not track workspace edits','מקור CAD קבוע; אינו עוקב אחרי עריכות סביבת העבודה'):c.current_microversion!==c.pinned_microversion?pick('New CAD revision available — review before updating work','גרסת CAD חדשה זמינה — יש לבדוק לפני עדכון עבודה'):pick('Matches the source at the last check','תואם למקור בזמן הבדיקה האחרונה')}{c?.checked_at&&<> · <time dateTime={c.checked_at}>{new Date(c.checked_at).toLocaleString(pick('en-GB','he-IL'))}</time></>}</li>;})}</ul>
  <a href="/engineering/cad">{pick('Review source designs in CAD Mentor','סקירת תכנוני המקור במנטור CAD')}</a>
 </section>;
}
