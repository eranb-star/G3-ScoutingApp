import { useMemo, useState } from "react";

type Pick=(english:string,hebrew:string)=>string;
type Course={id:string;title:string;domain:string};
type Module={id:string;course_id:string};
type Enrollment={id:string;course_id:string;member_id:string;status:string;due_at:string|null};
type Evidence={enrollment_id:string;module_id:string;status:string};
type Assessment={id:string;course_id:string;title:string;required:boolean;graded:boolean;passing_score:number|null;max_score:number|null;due_at:string|null;max_attempts:number};
type Submission={id:string;assessment_id:string;enrollment_id:string;member_id:string;status:string;score:number|null;feedback:string|null;submitted_at:string|null;attempt_number:number;answers:Record<string,string|string[]>;response:string};
type Person={id:string;display_name:string;subteam:string|null;subteams:string[]};

type Props={pick:Pick;profileId?:string;canReview:boolean;courses:Course[];modules:Module[];enrollments:Enrollment[];evidence:Evidence[];assessments:Assessment[];submissions:Submission[];people:Person[]};

type ProgressStatus="qualified"|"passed"|"submitted"|"changes_requested"|"overdue"|"in_progress"|"not_started";

export default function SkillsGradebook({pick,profileId,canReview,courses,modules,enrollments,evidence,assessments,submissions,people}:Props){
  const [courseFilter,setCourseFilter]=useState("all");
  const [memberFilter,setMemberFilter]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [expanded,setExpanded]=useState<string|null>(null);

  function passed(assessment:Assessment,submission:Submission){return submission.status==="reviewed"&&(!assessment.graded||assessment.passing_score==null||(submission.score??-1)>=assessment.passing_score);}
  function progress(enrollment:Enrollment){
    const courseModules=modules.filter(item=>item.course_id===enrollment.course_id);
    const approved=courseModules.filter(item=>evidence.some(row=>row.enrollment_id===enrollment.id&&row.module_id===item.id&&row.status==="approved")).length;
    const required=assessments.filter(item=>item.course_id===enrollment.course_id&&item.required);
    const attempts=submissions.filter(item=>item.enrollment_id===enrollment.id);
    const passedCount=required.filter(item=>attempts.some(row=>row.assessment_id===item.id&&passed(item,row))).length;
    const waiting=attempts.some(item=>item.status==="submitted");
    const changes=attempts.some(item=>item.status==="changes_requested");
    const overdue=(enrollment.due_at?new Date(`${enrollment.due_at}T23:59:59`).getTime()<Date.now():false)||required.some(item=>item.due_at&&new Date(item.due_at).getTime()<Date.now()&&!attempts.some(row=>row.assessment_id===item.id&&passed(item,row)));
    const complete=courseModules.length+required.length>0&&approved===courseModules.length&&passedCount===required.length;
    const status:ProgressStatus=enrollment.status==="qualified"?"qualified":complete?"passed":waiting?"submitted":changes?"changes_requested":overdue?"overdue":approved||attempts.length?"in_progress":"not_started";
    const total=courseModules.length+required.length,done=approved+passedCount;
    return{status,total,done,percent:total?Math.round(done/total*100):0,approved,moduleTotal:courseModules.length,passedCount,assessmentTotal:required.length,attempts};
  }

  const rows=useMemo(()=>enrollments.map(enrollment=>({enrollment,course:courses.find(item=>item.id===enrollment.course_id),person:people.find(item=>item.id===enrollment.member_id),...progress(enrollment)})),[enrollments,courses,people,modules,evidence,assessments,submissions]);
  const visible=rows.filter(row=>(canReview||row.enrollment.member_id===profileId)&&(courseFilter==="all"||row.enrollment.course_id===courseFilter)&&(statusFilter==="all"||row.status===statusFilter)&&(!memberFilter||row.person?.display_name.toLowerCase().includes(memberFilter.toLowerCase())));
  const mine=rows.filter(row=>row.enrollment.member_id===profileId);
  const summary=canReview?rows:mine;
  const metrics={complete:summary.filter(row=>["qualified","passed"].includes(row.status)).length,review:summary.filter(row=>row.status==="submitted").length,overdue:summary.filter(row=>row.status==="overdue").length,average:summary.length?Math.round(summary.reduce((sum,row)=>sum+row.percent,0)/summary.length):0};
  const label=(status:ProgressStatus)=>pick(({qualified:"Qualified",passed:"Requirements complete",submitted:"Awaiting review",changes_requested:"Changes requested",overdue:"Overdue",in_progress:"In progress",not_started:"Not started"})[status],({qualified:"הוסמך/ה",passed:"הדרישות הושלמו",submitted:"ממתין לבדיקה",changes_requested:"נדרשים שינויים",overdue:"באיחור",in_progress:"בתהליך",not_started:"טרם התחיל/ה"})[status]);

  function exportCsv(){
    const header=["Member","Course","Status","Progress","Modules","Assessments","Due"];
    const lines=visible.map(row=>[row.person?.display_name??"",row.course?.title??"",label(row.status),`${row.percent}%`,`${row.approved}/${row.moduleTotal}`,`${row.passedCount}/${row.assessmentTotal}`,row.enrollment.due_at??""]);
    const csv=[header,...lines].map(line=>line.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
    const link=document.createElement("a");link.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));link.download=`g3-skills-gradebook-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  return <section className="skills-gradebook">
    <header className="gradebook-hero"><div><span>{pick(canReview?"Instructor intelligence":"My learning path",canReview?"תובנות למדריכים":"מסלול הלמידה שלי")}</span><h2>{pick(canReview?"Skills gradebook":"My progress",canReview?"ספר ציונים ומיומנויות":"ההתקדמות שלי")}</h2><p>{pick(canReview?"See who is ready, who needs review and where support is needed.":"One clear view of completed work, upcoming requirements and results.",canReview?"ראו מי מוכן, מי ממתין לבדיקה והיכן נדרשת תמיכה.":"תמונה ברורה של עבודה שהושלמה, דרישות קרובות ותוצאות.")}</p></div><strong>{metrics.average}%<small>{pick("average progress","התקדמות ממוצעת")}</small></strong></header>
    <div className="gradebook-metrics">
      <article className="metric-ready"><span>✓</span><strong>{metrics.complete}</strong><small>{pick("complete","הושלמו")}</small></article>
      <article className="metric-review"><span>◷</span><strong>{metrics.review}</strong><small>{pick("awaiting review","ממתינים לבדיקה")}</small></article>
      <article className="metric-overdue"><span>!</span><strong>{metrics.overdue}</strong><small>{pick("overdue","באיחור")}</small></article>
      <article><span>↗</span><strong>{summary.length}</strong><small>{pick(canReview?"active enrollments":"assigned courses",canReview?"הקצאות פעילות":"קורסים שהוקצו")}</small></article>
    </div>
    {canReview?<div className="gradebook-filters"><label>{pick("Course","קורס")}<select value={courseFilter} onChange={event=>setCourseFilter(event.target.value)}><option value="all">{pick("All courses","כל הקורסים")}</option>{courses.map(course=><option value={course.id} key={course.id}>{course.title}</option>)}</select></label><label>{pick("Member","חבר/ה")}<input value={memberFilter} onChange={event=>setMemberFilter(event.target.value)} placeholder={pick("Search member…","חיפוש חבר/ה…")}/></label><label>{pick("Status","סטטוס")}<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">{pick("All statuses","כל הסטטוסים")}</option>{(["not_started","in_progress","submitted","changes_requested","overdue","passed","qualified"] as ProgressStatus[]).map(status=><option value={status} key={status}>{label(status)}</option>)}</select></label><button type="button" onClick={exportCsv}>↓ {pick("Export CSV","ייצוא CSV")}</button></div>:null}
    <div className="gradebook-list">{visible.length?visible.map(row=><article className={`gradebook-row status-${row.status}`} key={row.enrollment.id}><button type="button" className="gradebook-row-main" onClick={()=>setExpanded(expanded===row.enrollment.id?null:row.enrollment.id)} aria-expanded={expanded===row.enrollment.id}><span className="gradebook-person"><b>{canReview?row.person?.display_name:row.course?.title}</b><small>{canReview?row.course?.title:row.course?.domain}</small></span><span className={`gradebook-status status-${row.status}`}>{label(row.status)}</span><span className="gradebook-progress"><i><em style={{width:`${row.percent}%`}}/></i><b>{row.percent}%</b></span><span className="gradebook-counts"><small>{pick("Modules","יחידות")}</small><b>{row.approved}/{row.moduleTotal}</b></span><span className="gradebook-counts"><small>{pick("Assessments","מטלות")}</small><b>{row.passedCount}/{row.assessmentTotal}</b></span><span className="gradebook-expand">{expanded===row.enrollment.id?"−":"+"}</span></button>{expanded===row.enrollment.id?<div className="gradebook-detail"><div><strong>{pick("Assessment history","היסטוריית מטלות")}</strong>{assessments.filter(item=>item.course_id===row.enrollment.course_id).map(assessment=>{const attempts=row.attempts.filter(item=>item.assessment_id===assessment.id);return <section key={assessment.id}><header><b>{assessment.title}</b><span>{attempts.length}/{assessment.max_attempts} {pick("attempts","ניסיונות")}</span></header>{attempts.length?attempts.map(attempt=><div className="attempt-line" key={attempt.id}><span>#{attempt.attempt_number} · {attempt.status.replaceAll("_"," ")}</span><b>{attempt.score!=null?`${attempt.score}/${assessment.max_score}`:pick("No score","ללא ציון")}</b><small>{attempt.submitted_at?new Date(attempt.submitted_at).toLocaleString():""}</small>{attempt.response?<p><strong>{pick("Response","תשובה")}:</strong> {attempt.response}</p>:null}{Object.values(attempt.answers??{}).length?<p><strong>{pick("Answers","תשובות")}:</strong> {Object.values(attempt.answers).map(value=>Array.isArray(value)?value.join(" + "):value).join(" · ")}</p>:null}{attempt.feedback?<p><strong>{pick("Feedback","משוב")}:</strong> {attempt.feedback}</p>:null}</div>):<small>{pick("No submission yet","אין עדיין הגשה")}</small>}</section>})}</div><aside><strong>{pick("Course requirements","דרישות הקורס")}</strong><span>{row.approved}/{row.moduleTotal} {pick("modules approved","יחידות אושרו")}</span><span>{row.passedCount}/{row.assessmentTotal} {pick("required assessments passed","מטלות חובה עברו")}</span>{row.enrollment.due_at?<span>{pick("Course due","מועד הקורס")}: {new Date(`${row.enrollment.due_at}T12:00:00`).toLocaleDateString()}</span>:null}</aside></div>:null}</article>):<div className="academy-empty"><strong>{pick("No matching learning records","לא נמצאו רשומות למידה")}</strong><p>{pick("Change the filters or assign a course to begin tracking progress.","שנו את המסננים או הקצו קורס כדי להתחיל לעקוב אחר ההתקדמות.")}</p></div>}</div>
  </section>;
}
