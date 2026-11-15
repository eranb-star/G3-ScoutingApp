import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {AutoCheckout,supportsAutoCheckout,autoCheckoutGeneration,type AutoState} from '../lib/autoCheckout';

export default function AutoCheckoutPanel({attendanceId,open,ready}:{attendanceId?:string;open:boolean;ready:boolean}){
 const {profile,session}=useMemberAuth(),{pick}=useLocalization();
 const [status,setStatus]=useState<AutoState|null>(null),[enabled,setEnabled]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false);
 const native=supportsAutoCheckout();
 async function read(){if(!native||!profile)return;const [current,pref]=await Promise.all([AutoCheckout.status(),AutoCheckout.preference({memberId:profile.id})]);setStatus(current);setEnabled(pref.enabled);setLoaded(true);}
 useEffect(()=>{setConsent(false);setError('');setLoaded(false);if(!native||!profile)return;const refresh=()=>{if(document.visibilityState==='visible')void read().catch(()=>setError(pick('Install the latest APK to use remembered consent.','יש להתקין את ה־APK העדכני כדי לשמור הסכמה חד־פעמית.')));};refresh();document.addEventListener('visibilitychange',refresh);window.addEventListener('g3-auto-checkout-changed',refresh);const timer=window.setInterval(refresh,15000);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('g3-auto-checkout-changed',refresh);};},[native,profile?.id]);
 useEffect(()=>{if(!native||!ready)return;let cancelled=false;void AutoCheckout.status().then(async current=>{
  if(cancelled)return;
  if((current.memberId&&current.memberId!==profile?.id)||(attendanceId&&current.attendanceId&&current.attendanceId!==attendanceId)||(!open&&['armed','pending'].includes(current.state))){await AutoCheckout.stop();if(!cancelled)await read();}
 }).catch(()=>{});return()=>{cancelled=true;};},[native,ready,open,attendanceId,profile?.id]);
 const current=status?.memberId===profile?.id&&status?.attendanceId===attendanceId?status:null;
 useEffect(()=>{if(current?.state==='closed')window.dispatchEvent(new Event('g3-attendance-refresh'));},[current?.state]);
 async function enable(){if(!profile||!session)return;setBusy(true);setError('');const generation=autoCheckoutGeneration();let saved=false;try{
  await AutoCheckout.setPreference({memberId:profile.id,enabled:true});saved=true;setEnabled(true);setConsent(false);
  let device=await AutoCheckout.status();if(!device.permission)device=await AutoCheckout.locationPermission();
  if(!device.permission){setStatus(device);setError(pick('Preference saved. Allow precise location and “Allow all the time” in Android settings. Automatic checkout is not active yet.','ההעדפה נשמרה. יש לאפשר מיקום מדויק ו״כל הזמן״ בהגדרות Android. הצ׳ק־אאוט האוטומטי עדיין אינו פעיל.'));return;}
  if(generation!==autoCheckoutGeneration())return;
  if(open&&attendanceId)setStatus(await AutoCheckout.arm({attendanceId,memberId:profile.id,token:session.access_token}));else await read();
 }catch{setError(saved?pick('Preference saved, but automatic checkout did not start. Attendance is unchanged. Retry only inside the workshop.','ההעדפה נשמרה, אך הצ׳ק־אאוט האוטומטי לא הופעל. הנוכחות לא שונתה. נסו שוב רק מתוך הסדנה.'):pick('Preference was not saved. Please retry.','ההעדפה לא נשמרה. נסו שוב.'));await read().catch(()=>{});}finally{setBusy(false);}}
 async function disable(){if(!profile)return;setBusy(true);setError('');try{await AutoCheckout.setPreference({memberId:profile.id,enabled:false});await read();}catch{setError(pick('Could not save the preference. Please retry.','לא ניתן לשמור את ההעדפה. נסו שוב.'));}finally{setBusy(false);}}
 const messages:Record<string,[string,string]>={off:['Not enabled for this attendance','לא מופעל לנוכחות זו'],armed:['Automatic exit detection is active on this device','זיהוי יציאה אוטומטי פעיל במכשיר זה'],pending:['Exit detected. Verification is in progress; attendance is still open.','זוהתה יציאה. מתבצע אימות; הנוכחות עדיין פתוחה.'],closed:['Automatic checkout confirmed by the server.','השרת אישר צ׳ק־אאוט אוטומטי.'],observed:['Test mode: exit detected; attendance was NOT closed. Use normal checkout or ask an admin.','מצב בדיקה: זוהתה יציאה; הנוכחות לא נסגרה. יש לבצע צ׳ק־אאוט רגיל או לפנות למנהל.'],unavailable:['Exit could not be verified. Check attendance and contact an admin if needed.','לא ניתן היה לאמת יציאה. בדקו נוכחות ופנו למנהל במידת הצורך.'],interrupted:['Monitoring stopped after restart/update. Re-enable only inside the workshop.','הזיהוי הופסק לאחר הפעלה מחדש או עדכון. ניתן להפעיל שוב רק מתוך הסדנה.']};
 const failures:Record<string,[string,string]>={
 confirmation_timeout:['The verification window expired without a confirmed exit.','חלון האימות הסתיים ללא אישור יציאה.'],
 network_unavailable:['The phone could not reach the attendance service.','הטלפון לא הצליח להתחבר לשירות הנוכחות.'],
 location_unavailable:['A fresh, accurate location outside the workshop was unavailable.','לא התקבל מיקום עדכני ומדויק מחוץ לסדנה.'],
 permission_revoked:['Background or precise location permission is missing.','חסרה הרשאת מיקום ברקע או מיקום מדויק.'],
 background_start_blocked:['Android did not allow exit verification to start.','Android לא אפשר להפעיל את אימות היציאה.'],
 geofence_unavailable:['Android location monitoring is unavailable.','ניטור המיקום של Android אינו זמין.'],
 verification_rejected:['The server did not approve verification. Check attendance or contact an admin.','השרת לא אישר את האימות. יש לבדוק נוכחות או לפנות למנהל.']};
 if(!native)return null;
 const active=!!current&&['armed','pending'].includes(current.state);
 const message=messages[current?.state??'off']??messages.off;
 return <section className="hub-card auto-checkout-panel" aria-label={pick('Automatic checkout','צ׳ק־אאוט אוטומטי')}>
  <h3>{pick('Automatic checkout','צ׳ק־אאוט אוטומטי')}</h3>
  {loaded&&<p><strong>{enabled?pick('Enabled for future check-ins on this device','מופעל לכניסות הבאות שלך במכשיר זה'):pick('One-time setup on this device','הגדרה חד־פעמית במכשיר זה')}</strong></p>}
  {open&&<p role="status">{pick(...message)}</p>}
  {active&&current?.mode==='enforce'&&<p><strong>{pick('Live automatic checkout is active for this attendance.','סגירת נוכחות אוטומטית בפועל פעילה לנוכחות הזו.')}</strong></p>}
  {active&&current?.mode==='observe'&&<p><strong>{pick('Observation only — attendance will not close automatically.','מצב תצפית בלבד — הנוכחות לא תיסגר אוטומטית.')}</strong></p>}
  {current?.state==='unavailable'&&current.failureReason&&<p role="alert">{pick(...(failures[current.failureReason]??failures.verification_rejected))}</p>}
  <p>{pick('After one-time consent, each successful check-in in this Android app starts departure verification automatically. Background location is used only during an enrolled attendance; no route history is stored. Manual checkout remains available only inside the workshop.','לאחר הסכמה חד־פעמית, כל צ׳ק־אין מוצלח באפליקציית Android זו יפעיל את זיהוי היציאה אוטומטית. מיקום ברקע משמש רק בזמן נוכחות שהופעלה; לא נשמר מסלול תנועה. צ׳ק־אאוט ידני נשאר אפשרי רק מתוך הסדנה.')}</p>
  {loaded&&!enabled&&<><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{pick('I agree to background location and automatic activation after each check-in on this device','אני מסכים/ה למיקום ברקע ולהפעלה אוטומטית לאחר כל צ׳ק־אין במכשיר זה')}</label><button className="hub-button" disabled={busy||!consent||!ready} onClick={()=>void enable()}>{busy?pick('Saving…','שומר…'):pick('Enable for every check-in','הפעלה לכל צ׳ק־אין')}</button></>}
  {enabled&&<>{!open&&<p role="status">{pick('Ready for your next check-in. No location monitoring is running for a new attendance yet.','מוכן לצ׳ק־אין הבא שלך. עדיין לא מופעל ניטור לנוכחות חדשה.')}</p>}{open&&ready&&!active&&<button className="hub-button" disabled={busy} onClick={()=>void enable()}>{pick('Retry activation inside workshop','ניסיון הפעלה מתוך הסדנה')}</button>}<button className="hub-button" disabled={busy} onClick={()=>void disable()}>{pick('Turn off for this and future check-ins','כיבוי לנוכחות זו ולכניסות הבאות')}</button></>}
  {loaded&&status&&!status.permission&&<button className="hub-button" onClick={()=>void AutoCheckout.settings()}>{pick('Android permissions','הרשאות Android')}</button>}
  {error&&<p role="alert">{error}</p>}<Link to="/feedback">{pick('Report an attendance error to an admin','דיווח למנהל על טעות בנוכחות')}</Link>
 </section>;
}

export function AutoCheckoutAdmin(){
 const {profile}=useMemberAuth(),{pick}=useLocalization();const [mode,setMode]=useState('off'),[pilots,setPilots]=useState<string[]>([]),[members,setMembers]=useState<Array<{id:string;display_name:string}>>([]),[loaded,setLoaded]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(profile?.role!=='admin')return;void Promise.all([supabase.from('attendance_auto_policy').select('mode,pilot_members').single(),supabase.from('team_members').select('id,display_name').eq('active',true).in('role',['member','team_leader','admin']).order('display_name')]).then(([p,m])=>{if(p.error){setMessage(pick('Automatic checkout backend is not available yet.','שירות הצ׳ק־אאוט האוטומטי עדיין אינו זמין.'));return;}setMode(p.data.mode);setPilots(p.data.pilot_members);setMembers(m.data??[]);setLoaded(true);});},[profile?.id]);
 if(profile?.role!=='admin')return null;
 async function save(){setBusy(true);const r=await supabase.from('attendance_auto_policy').update({mode,pilot_members:pilots}).eq('singleton',true);setMessage(r.error?r.error.message:pick('Policy saved. Manual checkout rules are unchanged.','המדיניות נשמרה. כללי הצ׳ק־אאוט הידני לא השתנו.'));setBusy(false);}
 return <details className="hub-card auto-checkout-panel"><summary>{pick('Automatic checkout settings','הגדרות צ׳ק־אאוט אוטומטי')}</summary><p>{pick('All active members includes new members automatically. With one-time consent in the updated APK, each successful app check-in enrolls automatically from inside the workshop. Existing observation enrollments must be enabled again inside. Manual checkout remains restricted to the workshop.','כל החברים הפעילים כולל גם חברים חדשים אוטומטית. לאחר הסכמה חד־פעמית ב־APK המעודכן, כל צ׳ק־אין מוצלח באפליקציה מפעיל את הזיהוי אוטומטית מתוך הסדנה. הפעלה קיימת בתצפית מחייבת הפעלה מחדש מתוך הסדנה. צ׳ק־אאוט ידני נשאר מוגבל לסדנה.')}</p>{loaded&&<><label>{pick('Mode','מצב')}<select value={mode} onChange={e=>setMode(e.target.value)}><option value="off">{pick('Off','כבוי')}</option><option value="observe">{pick('Observe — no closing','תצפית — ללא סגירה')}</option><option value="enforce">{pick('Close for pilot members','סגירה למשתתפי הפיילוט')}</option><option value="enforce_all">{pick('Close for all active members','סגירה לכל חברי הקבוצה הפעילים')}</option></select></label>{mode==='enforce'&&members.map(m=><label key={m.id} style={{display:'block'}}><input type="checkbox" checked={pilots.includes(m.id)} onChange={e=>setPilots(p=>e.target.checked?[...p,m.id]:p.filter(id=>id!==m.id))}/>{m.display_name}</label>)}<button className="hub-button" disabled={busy} onClick={()=>void save()}>{pick('Save policy','שמירת מדיניות')}</button></>}{message&&<p role="status">{message}</p>}</details>;
}
