import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {useProjectRefresh} from '../lib/projectRefresh';
import type {ReviewGate} from './ProjectTaskReview';
export default function MentorReviewQueue(){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),navigate=useNavigate(),[items,setItems]=useState<ReviewGate[]>([]),[error,setError]=useState(false);
 const eligible=profile?.role==='mentor'||profile?.role==='admin';
 async function load(){if(!eligible)return;const r=await supabase.rpc('project_review_context');setError(!!r.error);if(!r.error)setItems(r.data??[]);}
 useEffect(()=>{void load();},[profile?.id]);useProjectRefresh(load);
 if(!eligible||(!items.length&&!error))return null;
 return <section className="hub-card mentor-review-queue"><header><h2>{pick('Awaiting your review','ממתין לביקורת שלך')}</h2><span>{items.length}</span></header>{error?<p role="status">{pick('Review queue unavailable. Open Projects for details.','תור הביקורות אינו זמין. פתחו פרויקטים לפרטים.')}</p>:items.map(item=><article key={item.task_id}><div><strong>{item.title}</strong><small>{pick('Revision','גרסה')} {item.submission?.revision} · {item.submission?new Date(item.submission.submitted_at).toLocaleDateString():''}</small>{item.due_at&&Date.parse(item.due_at)<Date.now()?<small>{pick('Milestone overdue','אבן הדרך באיחור')}</small>:null}</div><button onClick={()=>navigate(`/projects?project=${item.project_id}&task=${item.task_id}&review=1`)}>{pick('Review submission','בדיקת ההגשה')}</button></article>)}</section>;
}
