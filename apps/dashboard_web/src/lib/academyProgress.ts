export type LearningAssessment={id:string;course_id:string;title?:string;required:boolean;graded:boolean;passing_score:number|null;max_attempts?:number};
export type LearningAttempt={assessment_id:string;enrollment_id?:string;member_id:string;status:string;score:number|null;attempt_number?:number};
export function assessmentPassed(a:LearningAssessment,s:LearningAttempt){return s.status==='reviewed'&&(!a.graded||a.passing_score===null||(s.score!==null&&s.score>=a.passing_score));}
/** Display guidance only. Server grading and qualification remain authoritative. */
export function learningProgress(enrollment:{id:string;course_id:string;member_id:string;status:string},modules:{id:string;course_id:string;title?:string}[],evidence:{enrollment_id:string;module_id:string;status:string}[],assessments:LearningAssessment[],submissions:LearningAttempt[]){
 const required=assessments.filter(a=>a.course_id===enrollment.course_id&&a.required);
 const courseModules=modules.filter(m=>m.course_id===enrollment.course_id);
 const attempts=submissions.filter(s=>s.member_id===enrollment.member_id&&(!s.enrollment_id||s.enrollment_id===enrollment.id));
 const states=required.map(a=>{const history=attempts.filter(s=>s.assessment_id===a.id).sort((a,b)=>(b.attempt_number??0)-(a.attempt_number??0));const latest=history[0],passed=history.some(s=>assessmentPassed(a,s));return {id:a.id,title:a.title,passed,waiting:!passed&&latest?.status==='submitted',correction:!passed&&(latest?.status==='changes_requested'||latest?.status==='reviewed'),exhausted:!passed&&latest?.status!=='submitted'&&history.length>=(a.max_attempts??Infinity)};});
 const moduleStates=courseModules.map(m=>{const rows=evidence.filter(e=>e.enrollment_id===enrollment.id&&e.module_id===m.id);const passed=rows.some(e=>e.status==='approved');return {id:m.id,title:m.title,passed,waiting:!passed&&rows.some(e=>e.status==='submitted'),correction:!passed&&rows.some(e=>['rejected','changes_requested'].includes(e.status)),exhausted:false};});
 const all=[...states,...moduleStates],approved=moduleStates.filter(s=>s.passed).length,passedCount=states.filter(s=>s.passed).length,total=all.length,done=approved+passedCount;
 const actionable=all.filter(s=>!s.passed&&!s.waiting),next=actionable.find(s=>s.correction||s.exhausted)??actionable[0];
 const complete=total>0&&done===total,exhausted=all.some(s=>s.exhausted),changes=all.some(s=>s.correction),waiting=all.some(s=>s.waiting);
 const action=enrollment.status==='qualified'?'qualified':complete?'complete':next?.exhausted?'blocked':next?.correction?'correct':next?'continue':waiting?'waiting':'continue';
 return {approved,passedCount,total,done,percent:total?Math.round(done/total*100):0,moduleTotal:moduleStates.length,assessmentTotal:states.length,complete,exhausted,changes,waiting,action,next};
}
