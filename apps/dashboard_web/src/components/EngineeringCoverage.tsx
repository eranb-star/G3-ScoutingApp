import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useProjectRefresh} from '../lib/projectRefresh';

type CoverageRow={id:string;title:string;kind:string;current_revision:number};
type Gate={task_id:string;engineering_record_id:string;enabled:boolean};
export function EngineeringCoverage({projectId,records}:{projectId:string;records:CoverageRow[]}){
 const {pick}=useLocalization();const [gates,setGates]=useState<Gate[]>([]),[failed,setFailed]=useState(false);
 async function load(){try{const result=await supabase.from('project_review_gates').select('task_id,engineering_record_id,enabled').in('engineering_record_id',records.map(r=>r.id));if(result.error)throw result.error;setGates(result.data??[]);setFailed(false);}catch{setFailed(true);}}
 const ids=records.map(r=>r.id).join(',');useEffect(()=>{if(records.length)void load();else setGates([]);},[ids]);useProjectRefresh(()=>records.length?load():undefined);
 if(!records.length)return null;
 if(failed)return <p role="status">{pick('Checkpoint coverage could not be checked.','לא ניתן לבדוק את כיסוי נקודות הביקורת.')}</p>;
 const uncovered=records.filter(r=>!gates.some(g=>g.enabled&&g.engineering_record_id===r.id));
 return <details className="review-evidence-editor"><summary>{pick('Checkpoint coverage','כיסוי נקודות ביקורת')} · {records.length-uncovered.length}/{records.length}</summary>
 <p>{pick('Coverage shows records linked to an enabled checkpoint. It does not mean the work is approved. Open the task for its current evidence and release status.','הכיסוי מציג רשומות המקושרות לנקודת ביקורת פעילה. אין פירושו שהעבודה אושרה. פתחו את המשימה לצפייה בראיות ובמצב השחרור העדכני.')}</p>
 <ul>{records.map(r=><li key={r.id}><strong>{r.title} · v{r.current_revision}</strong>{gates.filter(g=>g.enabled&&g.engineering_record_id===r.id).map(g=><Link className="hub-button secondary" key={g.task_id} to={`/projects?project=${projectId}&task=${g.task_id}`}>{pick('Open checkpoint','פתיחת נקודת ביקורת')}</Link>)}{uncovered.some(u=>u.id===r.id)?<span>{pick(' — No enabled checkpoint',' — אין נקודת ביקורת פעילה')}</span>:null}</li>)}</ul></details>;
}
