import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {useAccessControl} from '../lib/accessControl';
import {eventContext,type ReadinessData} from '../lib/readiness';

export function useHomeReadiness(){
 const {profile}=useMemberAuth();const [data,setData]=useState<ReadinessData|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;setData(null);setError(false);async function load(){try{const result=await supabase.rpc('home_readiness_context');if(!alive)return;if(result.error){setError(true);return;}setData(result.data as ReadinessData);setError(false);}catch{if(alive)setError(true);}}
 if(profile){void load();}const refresh=()=>{if(document.visibilityState==='visible')void load();};const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('g3-actions-changed',refresh);document.addEventListener('visibilitychange',refresh);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('g3-actions-changed',refresh);document.removeEventListener('visibilitychange',refresh);};},[profile?.id]);return {data,error};
}
export function HomeEventContext({data,error}:{data:ReadinessData|null;error:boolean}){
 const {pick}=useLocalization(),navigate=useNavigate();
 if(error)return <p role="status">{pick('Readiness could not be refreshed. Open the source systems for current information.','לא ניתן לרענן את המוכנות. פתחו את מערכות המקור למידע עדכני.')}</p>;
 if(!data)return <p>{pick('Loading today’s context…','טוען את תמונת היום…')}</p>;
 return <div className="home-event-context">{data.event?<button onClick={()=>navigate(`/schedule?event=${data.event!.id}`)}>{eventContext(data.event,pick)} <span aria-hidden="true">↗</span></button>:<p>{pick('Your live command center for today’s team work.','מרכז השליטה החי שלכם לעבודת הקבוצה היום.')}</p>}{data.risks.length?<small>{pick(`${data.risks.length} active risks visible to you`,`${data.risks.length} סיכונים פעילים בתחום הצפייה שלך`)}</small>:null}</div>;
}
export function HomeTeamRisks({data,error}:{data:ReadinessData|null;error:boolean}){
 const {profile}=useMemberAuth(),{pick}=useLocalization(),access=useAccessControl(),navigate=useNavigate();const[all,setAll]=useState(false);
 if(!access.can('view_team_risks'))return null;
 const risks=data?.risks.filter(r=>r.assigned_user_id!==profile?.id)??[];
 const issues=risks.filter(r=>r.signal_type==='CRITICAL_ROBOT_ISSUE'),stock=risks.filter(r=>r.signal_type==='STOCK_BELOW_MINIMUM');
 return <section className="hub-card home-team-risks"><header><div><span className="readiness-eyebrow">{pick("ROBOT & INVENTORY","רובוט ומלאי")}</span><h2>{pick('Team readiness','מוכנות הקבוצה')}</h2></div>{data&&!error?<small>{pick('Updated','עודכן')} {new Date(data.as_of).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small>:null}</header>
 {error?<p role="status">{pick('Risk data is unavailable or stale; this does not mean the team is clear.','נתוני הסיכונים אינם זמינים או מעודכנים; אין פירוש הדבר שאין סיכונים.')}</p>:!data?<p>{pick('Loading readiness…','טוען מוכנות…')}</p>:<>
 {(all?issues:issues.slice(0,5)).map(r=><article key={r.id} className="readiness-risk severity-critical"><strong>{pick('Critical robot issue','תקלה קריטית ברובוט')}</strong><h3>{r.title}</h3><p>{r.summary}</p>{!r.assigned_user_id?<small>{pick('No owner assigned','טרם הוגדר אחראי')}</small>:null}<button onClick={()=>navigate(r.href)}>{pick('Open issue','פתיחת התקלה')} →</button></article>)}
 {issues.length>5?<button onClick={()=>setAll(!all)}>{pick(all?'Show fewer':'View all critical issues',all?'הצגת פחות':'כל התקלות הקריטיות')}</button>:null}
 {stock.length?<details className="readiness-stock-group"><summary>{pick(`${stock.length} inventory items need restocking`,`${stock.length} פריטי מלאי דורשים חידוש`)}</summary>{stock.map(r=><article key={r.id} className={`readiness-risk severity-${r.severity}`}><h3>{r.title}</h3><p>{r.summary}</p>{data.purchases.filter(p=>p.part_id===r.source_id).map(p=><small key={p.status}>{pick('Existing purchase requests','בקשות רכש קיימות')}: {p.requests} · {pick(p.status,p.status==='ordered'?'הוזמן':p.status==='approved'?'אושר':'ממתין לאישור')}</small>)}<button onClick={()=>navigate(r.href)}>{pick('Open inventory item','פתיחת פריט המלאי')} →</button></article>)}</details>:null}
 {!risks.length?<p>{pick('No additional active risks. Assigned critical issues appear in What needs you.','אין סיכונים פעילים נוספים. תקלות קריטיות שהוקצו לך מופיעות בסדר העדיפויות שלך.')}</p>:null}
 <small className="readiness-coverage">{pick('Checks cover critical robot issues and inventory items with stock monitoring enabled.','הבדיקות כוללות תקלות קריטיות ברובוט ופריטים שמעקב המלאי שלהם מופעל.')}</small>
 </>}
 </section>;
}
