import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import './CadMentorPage.css';
import CadReviewWorkspace from '../components/CadReviewWorkspace';
import CadDocumentBrowser from '../components/CadDocumentBrowser';

type Source={id:string;name:string;element_type:string;document_id:string;reference_type:string;reference_id:string;element_id:string};
export default function CadMentorPage(){
 const {pick}=useLocalization();
 const [status,setStatus]=useState<{configured:boolean;connected:boolean}|null>(null),[sources,setSources]=useState<Source[]>([]),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [authorizationUrl,setAuthorizationUrl]=useState('');
 const [selected,setSelected]=useState('');
 async function call(action:string,values:Record<string,unknown>={}){
  const result=await supabase.functions.invoke('onshape-connector',{body:{action,...values}});
  if(result.error||result.data?.error){
   let code=result.data?.code, message=result.data?.error;
   if(!code&&result.error?.context instanceof Response){try{const detail=await result.error.context.json();code=detail.code;message=detail.error;}catch{}}
   const errors:Record<string,[string,string]>={
    ACCESS_DENIED:['CAD connections currently require an active G3 admin account.','חיבורי CAD זמינים כרגע למנהלי G3 פעילים.'],
    SETUP_REQUIRED:['An administrator must finish the Onshape connector setup.','מנהל צריך להשלים את הגדרת החיבור ל-Onshape.'],
    INVALID_SOURCE:['Copy the complete design-tab link from cad.onshape.com.','העתיקו את הקישור המלא ללשונית התכנון מ-cad.onshape.com.'],
    CONNECT_REQUIRED:['Connect Onshape before selecting designs.','חברו את Onshape לפני בחירת תכנונים.'],
    RECONNECT_REQUIRED:['The Onshape connection expired or was revoked. Connect again.','החיבור ל-Onshape פג או בוטל. התחברו מחדש.'],
    RATE_LIMITED:['Onshape API limit reached. Try again later.','הגעתם למגבלת ה-API של Onshape. נסו שוב מאוחר יותר.'],
    UNSUPPORTED_ELEMENT:['Select a Part Studio or Assembly tab.','בחרו לשונית Part Studio או Assembly.'],
   };
   throw Error(code&&errors[code]?pick(...errors[code]):message||pick('Could not complete the CAD request. Check your connection and retry.','לא ניתן להשלים את בקשת ה-CAD. בדקו את החיבור ונסו שוב.'));
  }
  return result.data;
 }
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function load(){const state=await call('status');setStatus(state);setSources(state.connected?(await call('sources')).sources:[]);}
 useEffect(()=>{void run(load);},[]);
 return <main className="cad-mentor hub-page">
  <Link to="/engineering">← {pick('Engineering Hub','מרכז הנדסה')}</Link>
  <header className="cad-header"><div><span>G3 6740 · CAD</span><h1>{pick('CAD Mentor','מנטור CAD')}</h1><p>{pick('Connect your designs. Keep modeling in Onshape.','חברו את התכנונים שלכם. המשיכו לתכנן ב-Onshape.')}</p></div><button disabled={busy} onClick={()=>void run(load)}>{pick('Refresh','רענון')}</button></header>
  {error&&<p className="cad-error" role="alert">{error}</p>}
  <section className="cad-connection" aria-label={pick('Onshape connection','חיבור Onshape')}><div><h2>{status?.connected?pick('Onshape connected','Onshape מחובר'):pick('Connect the team’s Onshape','חיבור Onshape של הקבוצה')}</h2><p>{pick('Read-only access. Your password stays with Onshape. Only designs you select appear here.','גישה לקריאה בלבד. הסיסמה נשארת ב-Onshape. רק תכנונים שתבחרו יופיעו כאן.')}</p><small>{pick('This connection is private to your G3 admin account. Team sharing is not enabled.','החיבור פרטי לחשבון מנהל ה-G3 שלכם. שיתוף עם הקבוצה אינו מופעל.')}</small></div><div className="cad-actions">
   {authorizationUrl?<a className="primary" href={authorizationUrl}>{pick('Continue to Onshape →','המשך ל-Onshape ←')}</a>:<button className="primary" disabled={busy||!status?.configured} onClick={()=>void run(async()=>{const data=await call('connect');const target=new URL(data.url);if(target.origin!=='https://oauth.onshape.com')throw Error('Invalid authorization destination');setAuthorizationUrl(target.href);})}>{status?.connected?pick('Reconnect','חיבור מחדש'):pick('Connect Onshape','חיבור Onshape')}</button>}
   {status?.connected&&<button disabled={busy} onClick={()=>void run(async()=>{await call('disconnect');await load();})}>{pick('Disconnect G3','ניתוק G3')}</button>}
  </div></section>
  {status&&!status.configured&&<p role="status">{pick('Connector setup is pending. No private CAD has been imported.','הגדרת החיבור טרם הושלמה. לא יובא CAD פרטי.')}</p>}
  {status?.connected&&<><form className="cad-add" onSubmit={e=>{e.preventDefault();void run(async()=>{await call('add-source',{url});setUrl('');await load();});}}><label htmlFor="cad-source-link">{pick('Add a design from Onshape','הוספת תכנון מ-Onshape')}<small>{pick('Open the Part Studio or Assembly you want to review, then paste its link. An unfinished design is fine.','פתחו את ה-Part Studio או ה-Assembly לבדיקה והדביקו את הקישור. אפשר לבחור גם תכנון בתהליך.')}</small></label><div><input id="cad-source-link" type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://cad.onshape.com/documents/…" dir="ltr"/><button className="primary" disabled={busy||!url.trim()}>{pick('Add design','הוספת תכנון')}</button></div></form>
  <CadDocumentBrowser call={call} onAdded={async id=>{await load();setSelected(id);}}/><section><h2>{pick('Selected designs','תכנונים שנבחרו')}</h2><div className="cad-library">{sources.map(source=><article key={source.id}><span>{source.element_type==='ASSEMBLY'?pick('Assembly','הרכבה'):pick('Part Studio · parts and sketches','Part Studio · חלקים וסקיצות')}</span><h3>{source.name}</h3><button className='primary' disabled={busy} aria-pressed={selected===source.id} onClick={()=>setSelected(source.id)}>{pick('Inspect & review','בדיקה וסקירה')}</button><a href={`https://cad.onshape.com/documents/${source.document_id}/${source.reference_type}/${source.reference_id}/e/${source.element_id}`} target="_blank" rel="noreferrer">{pick('Open in Onshape','פתיחה ב-Onshape')} ↗</a></article>)}</div>{!sources.length&&<p>{pick('Add your first design above. Sketches and individual parts do not need a complete robot assembly.','הוסיפו את התכנון הראשון למעלה. סקיצות וחלקים בודדים אינם דורשים הרכבת רובוט שלמה.')}</p>}</section>{selected&&<CadReviewWorkspace key={selected} sourceId={selected} call={call}/>}</>}
 </main>;
}
