export type Trial={seconds:number;attempted:number;successful:number;faults:number;passed:boolean;note:string};
export type TestSetup={robot:string;mechanism:string;codeRevision:string|null;batteryId:string|null;batteryVolts:number|null;conditions:string;procedure:string;criterion:string;units:'seconds/counts/volts';simulation?:unknown};
export type TestRun={id:string;created_at:string;created_by:string;title:string;protocol:'can'|'intake'|'shooting'|'auto'|'driver';protocol_version:number;test_plan_id?:string|null;evidence_kind:'physical'|'simulated';setup:TestSetup;trials:Trial[];baseline_id:string|null;change_note:string;repair_task_id:string|null;correction_of:string|null};
export const protocols={
 driver:['Simulator driver mission','משימת נהיגה בסימולטור'],
 can:['CAN fault reproduction','שחזור תקלות CAN'],intake:['Intake pickup / jams','איסוף / תקיעות'],shooting:['Shooting accuracy / throughput','דיוק / קצב ירי'],auto:['Autonomous completion','השלמת אוטונומי'],
} as const;
export const protocolHelp={
 driver:['One attempt is one complete mission; success means the declared target was reached. Simulation only; no physical qualification.','ניסיון אחד הוא תרגיל מלא; הצלחה פירושה שהיעד שהוגדר הושג. סימולציה בלבד; ללא הסמכה פיזית.'],
 can:['Count observation cycles and cycles without the defined fault; record error occurrences as faults. Keep robot disabled during supervised electrical checks.','ספרו מחזורי תצפית ומחזורים ללא התקלה המוגדרת; רשמו מופעי שגיאה כתקלות. השאירו רובוט מושבת בבדיקות חשמל מפוקחות.'],
 intake:['Count presented and collected pieces, jams and elapsed time. Repeat the same approach, placement and piece condition.','ספרו חלקים שהוצגו ונאספו, תקיעות וזמן. חזרו על אותה גישה, מיקום ומצב חלקים.'],
 shooting:['Count attempted and successful shots, faults and elapsed time. Record distance, target and shooter settings in the procedure.','ספרו יריות שנוסו והצליחו, תקלות וזמן. תעדו מרחק, מטרה והגדרות ירי בנוהל.'],
 auto:['Each trial can be one route attempt: attempted=1, successful=0 or 1. Record completion time, faults and the exact route/revision.','כל ניסיון יכול להיות מסלול אחד: ניסיון=1, הצלחה=0 או 1. תעדו זמן השלמה, תקלות ומסלול/גרסה מדויקים.'],
} as const;
export function validateTrials(rows:Trial[]):string|null{
 if(!rows.length||rows.length>200)return 'Use 1–200 trials.';
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(!Number.isFinite(r.seconds)||r.seconds<=0||r.seconds>100000)return `Trial ${i+1}: duration must be greater than zero and at most 100000 seconds.`;
  if(['attempted','successful','faults'].some(k=>!Number.isInteger(r[k as 'attempted'])||r[k as 'attempted']<0||r[k as 'attempted']>100000)||r.attempted<1||r.successful>r.attempted)return `Trial ${i+1}: counts must be whole numbers; success cannot exceed attempts.`;
  if(typeof r.passed!=='boolean'||r.note.length>2000)return `Trial ${i+1}: invalid outcome or note.`;
 }return null;
}
/** RFC-style quoted cells, CRLF and commas/newlines in notes; no formula evaluation. */
export function parseTrialCsv(text:string):Trial[]{
 if(text.length>200000)throw Error('CSV exceeds 200 KB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Invalid CSV quote.');quoted=true;continue;}
  if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}continue;}
  if(closed)throw Error('Unexpected text after CSV quote.');cell+=c;
 }
 if(quoted)throw Error('Unclosed CSV quote.');if(cell||row.length){row.push(cell);if(row.some(Boolean))rows.push(row);}
 const header=rows.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim());
 if(header?.join(',')!=='seconds,attempted,successful,faults,passed,note')throw Error('Expected header: seconds,attempted,successful,faults,passed,note');
 const result=rows.map((r,i)=>{
  if(r.length!==6||r.slice(0,4).some(v=>!v.trim()||!/^\d+(\.\d+)?$/.test(v.trim()))||!['true','false'].includes(r[4].trim()))throw Error(`CSV row ${i+2}: invalid values; passed must be true or false.`);
  return {seconds:Number(r[0]),attempted:Number(r[1]),successful:Number(r[2]),faults:Number(r[3]),passed:r[4].trim()==='true',note:r[5]};
 });const error=validateTrials(result);if(error)throw Error(error);return result;
}
export function summarizeTrials(rows:Trial[]){
 const n=rows.length,total=rows.reduce((a,r)=>({seconds:a.seconds+r.seconds,attempted:a.attempted+r.attempted,successful:a.successful+r.successful,faults:a.faults+r.faults,passed:a.passed+Number(r.passed)}),{seconds:0,attempted:0,successful:0,faults:0,passed:0});
 const mean=n?total.seconds/n:null;
 return {...total,n,mean,sd:n>1?Math.sqrt(rows.reduce((a,r)=>a+(r.seconds-mean!)**2,0)/(n-1)):null,min:n?Math.min(...rows.map(r=>r.seconds)):null,max:n?Math.max(...rows.map(r=>r.seconds)):null,successRate:total.attempted?100*total.successful/total.attempted:null,perMinute:total.seconds?60*total.successful/total.seconds:null};
}
export function comparisonIssues(a:TestRun,b:TestRun):string[]{
 const issues:string[]=[];
 for(const key of ['protocol','protocol_version','evidence_kind'] as const)if(a[key]!==b[key])issues.push(key);
 for(const key of ['robot','mechanism','conditions','procedure','criterion','units'] as const)if(a.setup[key].trim()!==b.setup[key].trim())issues.push(key);
 if(a.protocol==='driver'||b.protocol==='driver'){if(!a.setup.simulation||!b.setup.simulation||JSON.stringify(a.setup.simulation)!==JSON.stringify(b.setup.simulation))issues.push('simulation settings');return issues;}
 // Voltage and code may be the deliberate changed factor; disclose them separately in the UI.
 if(a.setup.batteryVolts===null||b.setup.batteryVolts===null)issues.push('battery voltage unknown');
 if(!a.setup.batteryId||!b.setup.batteryId)issues.push('battery identity unknown');
 return issues;
}
