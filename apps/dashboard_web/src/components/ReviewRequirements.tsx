import {useLocalization} from '../lib/localization';
export type MilestoneRequirement={requirement:string;acceptance:string;method:string};
export const emptyRequirement=():MilestoneRequirement=>({requirement:'',acceptance:'',method:'test'});
export function ReviewRequirements({items,onChange,disabled}:{items:MilestoneRequirement[];onChange:(items:MilestoneRequirement[])=>void;disabled:boolean}){
 const {pick}=useLocalization();
 const methods=[['test','Test','בדיקה'],['inspection','Inspection','ביקורת'],['analysis','Analysis','ניתוח'],['demonstration','Demonstration','הדגמה']];
 function update(i:number,key:keyof MilestoneRequirement,value:string){onChange(items.map((r,index)=>index===i?{...r,[key]:value}:r));}
 return <fieldset className="review-evidence-editor" disabled={disabled}><legend>{pick('Milestone requirements','דרישות אבן הדרך')}</legend>
 <p>{pick('Define what must be demonstrated before the mentor can approve this milestone. All listed criteria apply.','הגדירו מה יש להוכיח לפני אישור אבן הדרך על ידי המנטור. כל התנאים ברשימה נדרשים.')}</p>
 {items.map((r,i)=><div className="review-evidence-item" key={i}><strong>{pick('Requirement','דרישה')} {i+1}</strong>
 <label>{pick('What must be achieved?','מה נדרש להשיג?')}<input required minLength={3} maxLength={160} value={r.requirement} onChange={e=>update(i,'requirement',e.target.value)}/></label>
 <label>{pick('Measurable acceptance criterion','תנאי קבלה מדיד')}<textarea required minLength={3} maxLength={600} rows={3} placeholder={pick('Example: withstand 100 N for 30 seconds without permanent deformation','לדוגמה: עמידה בעומס 100 ניוטון במשך 30 שניות ללא עיוות קבוע')} value={r.acceptance} onChange={e=>update(i,'acceptance',e.target.value)}/></label>
 <label>{pick('How will it be verified?','כיצד יתבצע האימות?')}<select value={r.method} onChange={e=>update(i,'method',e.target.value)}>{methods.map(([v,en,he])=><option key={v} value={v}>{pick(en,he)}</option>)}</select></label>
 {items.length>1?<button type="button" className="hub-button secondary" onClick={()=>onChange(items.filter((_,index)=>index!==i))}>{pick('Remove requirement','הסרת דרישה')} {i+1}</button>:null}</div>)}
 {items.length<10?<button type="button" className="hub-button secondary" onClick={()=>onChange([...items,emptyRequirement()])}>{pick('Add requirement','הוספת דרישה')}</button>:null}
 </fieldset>;
}
