import {learningProgress} from '../lib/academyProgress';
import { academyText,academyFeedback } from '../lib/academyLanguage';
import './academyWorkspace.css';
type Props = {
  credits?:{member_id:string;assessment_id:string}[];
  pick:(en:string,he:string)=>string;
  memberId?:string;
  courses:{id:string;title:string;description:string}[];
  enrollments:{id:string;course_id:string;member_id:string;status:string;due_at:string|null}[];
  assessments:{id:string;course_id:string;required:boolean;graded:boolean;passing_score:number|null;assessment_type?:string;max_attempts?:number}[];
  submissions:{id:string;assessment_id:string;member_id:string;status:string;score:number|null;feedback:string|null}[];
  modules:{id:string;course_id:string;title?:string}[];
  evidence:{enrollment_id:string;module_id:string;status:string}[];
  open:(id:string,feedback?:boolean,step?:number)=>void;
  explore:()=>void;
};
export default function AcademyHome({credits=[],pick,memberId,courses,enrollments,assessments,submissions,modules,evidence,open,explore}:Props){
  const assigned=enrollments.filter(e=>e.member_id===memberId);
  const latest=new Map<string,Props['submissions'][number]>();
  for(const s of submissions)if(s.member_id===memberId&&!latest.has(s.assessment_id))latest.set(s.assessment_id,s);
  const correction=Array.from(latest.values()).filter(s=>s.status==='changes_requested');
  const rows=assigned.map(e=>{
    const course=courses.find(c=>c.id===e.course_id);
    const required=assessments.filter(a=>a.course_id===e.course_id&&a.required);
    const passed=required.filter(a=>submissions.some(s=>s.member_id===memberId&&s.assessment_id===a.id&&s.status==='reviewed'&&(!a.graded||a.passing_score===null||(s.score!==null&&s.score>=a.passing_score)))).length;
    const needsCorrection=correction.some(s=>assessments.find(a=>a.id===s.assessment_id)?.course_id===e.course_id);
    const progress=learningProgress(e,modules,evidence,assessments,submissions,credits);
    return {e,course,required,passed,needsCorrection:progress.changes,progress};
  }).filter(r=>r.course).sort((a,b)=>Number(b.needsCorrection)-Number(a.needsCorrection)||(a.e.due_at??'9999').localeCompare(b.e.due_at??'9999'));
  const next=rows.find(r=>['correct','blocked','continue'].includes(r.progress.action))??rows.find(r=>r.progress.action!=='qualified');
  const actionText=(action:string)=>({qualified:pick('Completed and approved','הושלם ואושר'),complete:pick('Requirements complete · awaiting qualification','הדרישות הושלמו · ממתין להסמכה'),waiting:pick('Awaiting review · no resubmission needed','ממתין לבדיקה · אין צורך בהגשה נוספת'),blocked:pick('No attempts remain · contact your instructor','לא נותרו ניסיונות · פנו למדריך'),correct:pick('Review feedback and retry','עיינו במשוב ונסו שוב'),continue:pick('Continue learning','המשך למידה')})[action]??'';
  return <div className="academy-home-grid"><section>
    <article className="academy-next-card"><span className="academy-kicker">{pick('YOUR NEXT STEP','הצעד הבא שלך')}</span>
      <h2>{next?.course?.title??pick('Ready to learn something new?','מוכנים ללמוד משהו חדש?')}</h2>
      <p>{next?actionText(next.progress.action):pick('No unfinished assigned courses. Explore the library.','אין קורסים מוקצים שלא הושלמו. עיינו בספרייה.')}{next?.progress.next?.title&&<> · {academyText(next.progress.next.title,pick)}</>}</p>
      {next&&<p className="academy-meta">{next.progress.done}/{next.progress.total} {pick('requirements complete','דרישות הושלמו')}{next.e.due_at&&` · ${pick('Due','עד')}: ${next.e.due_at}`}</p>}
      <button className="hub-button" onClick={()=>next?open(next.e.course_id,next.needsCorrection,next.progress.action==='waiting'||next.progress.action==='blocked'||next.progress.action==='complete'?3:assessments.find(a=>a.id===next.progress.next?.id)?.assessment_type==='quiz'?1:assessments.find(a=>a.id===next.progress.next?.id)?.assessment_type==='practical'?2:undefined):explore()}>{next?pick('Open next activity / feedback','פתיחת הפעילות הבאה / המשוב'):pick('Explore learning','חקירת אפשרויות למידה')} →</button>
    </article>
    <h2>{pick('My assigned courses','הקורסים שהוקצו לי')}</h2><div className="academy-course-rows">{rows.map(({e,course,required,passed,needsCorrection,progress})=><article key={e.id}><div><h3>{course!.title}</h3><p>{e.status==='qualified'?pick('Completed and approved','הושלם ואושר'):needsCorrection?pick('Feedback needs your attention','משוב שמצריך את תשומת ליבך'):`${progress.done}/${progress.total} · ${actionText(progress.action)}`}</p></div><button onClick={()=>open(e.course_id,needsCorrection)}>{pick('Open course','פתיחת קורס')}</button></article>)}</div>
  </section><aside><article className="academy-side-card"><h2>{pick('Feedback & next actions','משוב ופעולות הבאות')}</h2>{correction.length?correction.map(s=>{const a=assessments.find(a=>a.id===s.assessment_id),c=courses.find(c=>c.id===a?.course_id);return c?<div key={s.id} className="academy-feedback-item"><h3>{c.title}</h3><p>{academyFeedback(s.feedback,pick)||pick('Open your submission to review the requested correction.','פתחו את ההגשה לעיון בתיקון המבוקש.')}</p><button onClick={()=>open(c.id,true)}>{pick('Read feedback','קריאת משוב')}</button></div>:null;}):<p>{pick('No corrections waiting for you. Submitted practical work may still be awaiting review.','אין תיקונים שממתינים לך. עבודה מעשית שהוגשה עשויה עדיין להמתין לבדיקה.')}</p>}</article><article className="academy-side-card"><h3>{pick('Learn by exploring','לומדים דרך חקירה')}</h3><p>{pick('Open reference material and published robot CAD without creating another assignment.','פתחו מקורות ומודלי CAD של רובוטים בלי ליצור מטלה חדשה.')}</p><button onClick={explore}>{pick('Open Explore','פתיחת אזור החקירה')}</button></article></aside></div>;
}
