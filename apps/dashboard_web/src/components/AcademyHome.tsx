import { academyFeedback } from '../lib/academyLanguage';
import './academyWorkspace.css';
type Props = {
  pick:(en:string,he:string)=>string;
  memberId?:string;
  courses:{id:string;title:string;description:string}[];
  enrollments:{id:string;course_id:string;member_id:string;status:string;due_at:string|null}[];
  assessments:{id:string;course_id:string;required:boolean;graded:boolean;passing_score:number|null}[];
  submissions:{id:string;assessment_id:string;member_id:string;status:string;score:number|null;feedback:string|null}[];
  open:(id:string,feedback?:boolean)=>void;
  explore:()=>void;
};
export default function AcademyHome({pick,memberId,courses,enrollments,assessments,submissions,open,explore}:Props){
  const assigned=enrollments.filter(e=>e.member_id===memberId);
  const latest=new Map<string,Props['submissions'][number]>();
  for(const s of submissions)if(s.member_id===memberId&&!latest.has(s.assessment_id))latest.set(s.assessment_id,s);
  const correction=Array.from(latest.values()).filter(s=>s.status==='changes_requested');
  const rows=assigned.map(e=>{
    const course=courses.find(c=>c.id===e.course_id);
    const required=assessments.filter(a=>a.course_id===e.course_id&&a.required);
    const passed=required.filter(a=>submissions.some(s=>s.member_id===memberId&&s.assessment_id===a.id&&s.status==='reviewed'&&(!a.graded||a.passing_score===null||(s.score!==null&&s.score>=a.passing_score)))).length;
    const needsCorrection=correction.some(s=>assessments.find(a=>a.id===s.assessment_id)?.course_id===e.course_id);
    return {e,course,required,passed,needsCorrection};
  }).filter(r=>r.course).sort((a,b)=>Number(b.needsCorrection)-Number(a.needsCorrection)||(a.e.due_at??'9999').localeCompare(b.e.due_at??'9999'));
  const next=rows.find(r=>r.e.status!=='qualified');
  return <div className="academy-home-grid"><section>
    <article className="academy-next-card"><span className="academy-kicker">{pick('YOUR NEXT STEP','הצעד הבא שלך')}</span>
      <h2>{next?.course?.title??pick('Ready to learn something new?','מוכנים ללמוד משהו חדש?')}</h2>
      <p>{next?next.needsCorrection?pick('Your reviewer left feedback. Make the correction and submit a new demonstration.','הבודק השאיר משוב. בצעו את התיקון והגישו הדגמה חדשה.'):pick('Continue your assigned course. Lessons, assessments and feedback stay together.','המשיכו בקורס שהוקצה לכם. השיעורים, המטלות והמשוב נשארים יחד.'):pick('No unfinished assigned courses. Explore the library or ask your instructor for your next course.','אין קורסים מוקצים שטרם הושלמו. עיינו בספרייה או בקשו מהמדריך את הקורס הבא.')}</p>
      {next&&<p className="academy-meta">{next.passed}/{next.required.length} {pick('required assessments passed','מטלות חובה עברו')}{next.e.due_at&&` · ${pick('Due','עד')}: ${next.e.due_at}`}</p>}
      <button className="hub-button" onClick={()=>next?open(next.e.course_id,next.needsCorrection):explore()}>{next?pick('Continue learning','המשך למידה'):pick('Explore learning','חקירת אפשרויות למידה')} →</button>
    </article>
    <h2>{pick('My assigned courses','הקורסים שהוקצו לי')}</h2><div className="academy-course-rows">{rows.map(({e,course,required,passed,needsCorrection})=><article key={e.id}><div><h3>{course!.title}</h3><p>{e.status==='qualified'?pick('Completed and approved','הושלם ואושר'):needsCorrection?pick('Feedback needs your attention','משוב שמצריך את תשומת ליבך'):`${passed}/${required.length} ${pick('required assessments passed','מטלות חובה עברו')}`}</p></div><button onClick={()=>open(e.course_id,needsCorrection)}>{pick('Open course','פתיחת קורס')}</button></article>)}</div>
  </section><aside><article className="academy-side-card"><h2>{pick('Feedback & next actions','משוב ופעולות הבאות')}</h2>{correction.length?correction.map(s=>{const a=assessments.find(a=>a.id===s.assessment_id),c=courses.find(c=>c.id===a?.course_id);return c?<div key={s.id} className="academy-feedback-item"><h3>{c.title}</h3><p>{academyFeedback(s.feedback,pick)||pick('Open your submission to review the requested correction.','פתחו את ההגשה לעיון בתיקון המבוקש.')}</p><button onClick={()=>open(c.id,true)}>{pick('Read feedback','קריאת משוב')}</button></div>:null;}):<p>{pick('No corrections waiting for you. Submitted practical work may still be awaiting review.','אין תיקונים שממתינים לך. עבודה מעשית שהוגשה עשויה עדיין להמתין לבדיקה.')}</p>}</article><article className="academy-side-card"><h3>{pick('Learn by exploring','לומדים דרך חקירה')}</h3><p>{pick('Open reference material and published robot CAD without creating another assignment.','פתחו מקורות ומודלי CAD של רובוטים בלי ליצור מטלה חדשה.')}</p><button onClick={explore}>{pick('Open Explore','פתיחת אזור החקירה')}</button></article></aside></div>;
}
