import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {academyText} from '../lib/academyLanguage';
import {readBuildPages} from '../lib/robotBuildWorkspace';
import {buildLearningReturn,buildLearningStatus} from '../lib/buildLearning';
import {useBuildStringDraft} from '../lib/buildFormDraft';
import BuildDraftNotice from './BuildDraftNotice';
type Course={id:string;title:string;active:boolean};
type Reference={step_id:number;course_id:string;step_title:string};
export default function BuildOperationLearning({job,canManage}:{job:{id:string;revision:number;operations?:{id:number;title:string}[]};canManage:boolean}){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),location=useLocation();
 const initial=()=>({step:'',course:'',expected:String(job.revision)}),draft=useBuildStringDraft(`operation-learning:${job.id}`,initial,job.revision);
 const [courses,setCourses]=useState<Course[]>([]),[links,setLinks]=useState<Reference[]>([]),[enrollments,setEnrollments]=useState<{course_id:string;status:string}[]>([]),[official,setOfficial]=useState<{course_id:string;status:string}[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError('');void (async()=>{try{
  const [refs,c,e,o]=await Promise.all([
   readBuildPages<Reference>((a,z)=>supabase.from('robot_build_operation_learning').select('step_id,course_id,step_title').eq('job_id',job.id).order('step_id').order('course_id').range(a,z)),
   readBuildPages<Course>((a,z)=>supabase.from('training_courses').select('id,title,active').order('id').range(a,z)),
   readBuildPages<{course_id:string;status:string}>((a,z)=>supabase.from('training_enrollments').select('course_id,status').eq('member_id',profile?.id??'00000000-0000-0000-0000-000000000000').order('id').range(a,z)),
   readBuildPages<{course_id:string;status:string}>((a,z)=>supabase.from('training_official_completions').select('course_id,status').eq('member_id',profile?.id??'00000000-0000-0000-0000-000000000000').order('course_id').order('certificate_id').range(a,z))
  ]);if(live){setLinks(refs);setCourses(c);setEnrollments(e);setOfficial(o);}
 }catch{if(live)setError(pick('Learning status could not be checked. Retry before assuming a course is incomplete.','לא ניתן לבדוק את מצב הלמידה. נסו שוב לפני שמניחים שהקורס לא הושלם.'));}finally{if(live)setLoading(false);}})();return()=>{live=false;};},[job.id,job.revision,profile?.id,reload]);
 async function save(remove?:Reference){if(busy)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('link_robot_build_learning',{p_job:job.id,p_step:remove?.step_id??Number(draft.value.step),p_course:remove?.course_id??draft.value.course,p_expected:remove?job.revision:Number(draft.value.expected),p_remove:!!remove});if(r.error)throw r.error;if(!remove)draft.saved(initial());setReload(n=>n+1);setMessage(pick('Learning link saved. Enrollment and qualifications are unchanged.','קישור הלמידה נשמר. ההרשמה וההסמכות לא השתנו.'));}catch(e){setMessage((e as {message?:string}).message??pick('Save not confirmed.','השמירה לא אושרה.'));}finally{setBusy(false);}}
 const back=buildLearningReturn(location.pathname+location.search);
 const labels:Record<string,[string,string]>={completed:['Already completed — no repeat required','כבר הושלם — אין צורך לחזור'],pending:['Evidence awaiting review','ראיות ממתינות לבדיקה'],in_progress:['Learning in progress','למידה בתהליך'],assigned:['Assigned to you','הוקצה לך'],unassigned:['Available to explore — not assigned','זמין לעיון — לא הוקצה']};
 return <section className="build-operation-learning" aria-label={pick('Learning for this operation','למידה לפעולה זו')}><h4>{pick('Learn before you work','למידה לפני העבודה')}</h4>
 <p>{pick('Use existing Academy lessons. Completion here never grants machine authorization or replaces workshop supervision.','השתמשו בשיעורים הקיימים באקדמיה. השלמת קורס אינה מעניקה הרשאת מכונה ואינה מחליפה פיקוח בסדנה.')}</p>
 {loading?<p role="status">{pick('Checking your existing completion…','בודק השלמה קיימת…')}</p>:error?<p role="alert">{error} <button type="button" onClick={()=>setReload(n=>n+1)}>{pick('Retry','ניסיון נוסף')}</button></p>:<>
 {!links.length&&<p>{pick('No learning references linked to this process yet.','טרם קושרו מקורות למידה לתהליך זה.')}</p>}
 <ul>{links.map(ref=>{const course=courses.find(c=>c.id===ref.course_id),step=job.operations?.find(s=>s.id===ref.step_id),changed=step?.title!==ref.step_title;
 const status=buildLearningStatus(enrollments.find(e=>e.course_id===ref.course_id)?.status,official.some(o=>o.course_id===ref.course_id&&o.status==='verified')?'verified':official.find(o=>o.course_id===ref.course_id&&o.status==='submitted')?.status);
 const params=new URLSearchParams({course:ref.course_id,view:ref.course_id.startsWith('67402026-1002-')?'practical':'content'});if(back)params.set('return',back);
 return <li key={`${ref.step_id}:${ref.course_id}`}><strong>{ref.step_title}</strong> · {academyText(course?.title,pick)||pick('Course unavailable','הקורס אינו זמין')}<p>{pick(...labels[status])}</p>{changed&&<p role="status">{pick('Process changed — team leader must check this reference.','התהליך השתנה — על מוביל/ת הצוות לבדוק את הקישור.')}</p>}{course?.active?<Link to={'/growth?'+params}>{status==='completed'?pick('Review completed course','עיון בקורס שהושלם'):pick('Open lesson','פתיחת השיעור')}</Link>:<span>{pick('Course archived or unavailable; ask the team leader for a replacement.','הקורס בארכיון או אינו זמין; בקשו חלופה ממוביל/ת הצוות.')}</span>}{canManage&&<button type="button" disabled={busy} onClick={()=>void save(ref)}>{pick('Remove link','הסרת קישור')}</button>}</li>;})}</ul>
 {canManage&&<details><summary>{pick('Link an existing course','קישור קורס קיים')}</summary><form data-build-form={draft.id} onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}><BuildDraftNotice {...draft}/><label>{pick('Operation','פעולה')}<select required value={draft.value.step} onChange={e=>draft.change({step:e.target.value})}><option value="">{pick('Choose operation','בחירת פעולה')}</option>{job.operations?.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label>{pick('Academy course','קורס באקדמיה')}<select required value={draft.value.course} onChange={e=>draft.change({course:e.target.value})}><option value="">{pick('Choose existing course','בחירת קורס קיים')}</option>{courses.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{academyText(c.title,pick)}</option>)}</select></label><button>{pick('Link course','קישור הקורס')}</button></fieldset></form></details>}
 </>}<p role="status">{message}</p></section>;
}
