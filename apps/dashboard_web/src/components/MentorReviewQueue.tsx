import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {useProjectRefresh} from '../lib/projectRefresh';
import type {ReviewGate} from './ProjectTaskReview';
export default function MentorReviewQueue({includePlanned=false}:{includePlanned?:boolean}){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),navigate=useNavigate(),[items,setItems]=useState<ReviewGate[]>([]),[error,setError]=useState(false);
 const eligible=profile?.role==='mentor'||profile?.role==='admin';
 async function load(){if(!eligible)return;const r=await supabase.rpc('project_review_context');const planned=includePlanned?await supabase.rpc('planned_mentor_reviews'):{data:[],error:null};setError(!!r.error||!!planned.error);setItems([...(r.data??[]),...(planned.data??[])].filter((g:ReviewGate)=>g.reviewer_id===profile?.id));}
 useEffect(()=>{void load();},[profile?.id]);useProjectRefresh(load);
 if(!eligible||(!items.length&&!error))return null;
 return <section className="hub-card mentor-review-queue"><header><h2>{pick(includePlanned?'Your review schedule':'Awaiting your review',includePlanned?'תכנון הביקורות שלך':'ממתין לביקורת שלך')}</h2><span>{items.length}</span></header>{error?<p role="status">{pick('Review queue unavailable. Open Projects for details.','תור הביקורות אינו זמין. פתחו פרויקטים לפרטים.')}</p>:items.map(item=><article key={item.task_id}><div><strong>{item.title}</strong>{!item.submission?<small>{pick("Planned · not submitted — no action yet","מתוכנן · טרם הוגש — אין פעולה כעת")}</small>:null}{item.due_at?<small>{pick("Checkpoint due","מועד אבן הדרך")}: {new Date(item.due_at).toLocaleDateString()}</small>:null}<small>{pick('Revision','גרסה')} {item.submission?.revision} · {item.submission?new Date(item.submission.submitted_at).toLocaleDateString():''}</small>{item.due_at&&Date.parse(item.due_at)<Date.now()?<small>{pick('Milestone overdue','אבן הדרך באיחור')}</small>:null}</div><button onClick={()=>navigate(`/projects?project=${item.project_id}&task=${item.task_id}&review=1`)}>{pick(item.submission?'Review submission':'Open planned checkpoint',item.submission?'בדיקת ההגשה':'פתיחת ביקורת מתוכננת')}</button></article>)}</section>;
}
