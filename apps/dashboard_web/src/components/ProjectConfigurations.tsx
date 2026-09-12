import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {notifyProjectChange,useProjectRefresh} from '../lib/projectRefresh';
export type RobotConfiguration={id:string;name:string;revision:string;configuration_kind:string;details:string};
export function useProjectConfigurations(projectId:string){const[items,setItems]=useState<RobotConfiguration[]>([]);async function load(){const r=await supabase.from('project_robot_configurations').select('id,name,revision,configuration_kind,details').eq('project_id',projectId).order('created_at',{ascending:false});if(!r.error)setItems(r.data??[]);}useEffect(()=>{void load();},[projectId]);useProjectRefresh(load);return items;}
export default function ProjectConfigurations({projectId}:{projectId:string}){
 const {pick}=useLocalization();const[name,setName]=useState(''),[revision,setRevision]=useState(''),[kind,setKind]=useState('as_built'),[details,setDetails]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <details className="review-evidence-editor"><summary>{pick('Register robot / prototype configuration','רישום תצורת רובוט / אב־טיפוס')}</summary><p>{pick('Save the exact parts and software revisions tested. Saved records are retained; create a new revision when the configuration changes.','שמרו את גרסאות החלקים והתוכנה שנבדקו. רשומות נשמרות; צרו גרסה חדשה כאשר התצורה משתנה.')}</p>
 <form className="review-evidence-item" onSubmit={async e=>{e.preventDefault();setBusy(true);const r=await supabase.rpc('create_project_configuration',{p_project:projectId,p_name:name,p_revision:revision,p_kind:kind,p_details:details});setBusy(false);setMessage(r.error?.message??pick('Configuration registered. It is now available for test findings.','התצורה נשמרה וזמינה לרישום ממצאי בדיקות.'));if(!r.error){setName('');setRevision('');setDetails('');notifyProjectChange();}}}>
 <label>{pick('Robot / prototype name','שם הרובוט / אב־הטיפוס')}<input required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>{pick('Configuration revision','גרסת התצורה')}<input required maxLength={120} value={revision} onChange={e=>setRevision(e.target.value)}/></label>
 <label>{pick('State','מצב')}<select value={kind} onChange={e=>setKind(e.target.value)}><option value="as_built">{pick('As built','כפי שנבנה')}</option><option value="as_installed">{pick('As installed','כפי שהותקן')}</option><option value="designed">{pick('Designed (not a physical test configuration)','מתוכנן (לא תצורה לבדיקה פיזית)')}</option></select></label>
 <label>{pick('Parts, software versions and configuration details','חלקים, גרסאות תוכנה ופרטי התצורה')}<textarea required minLength={3} maxLength={4000} rows={4} value={details} onChange={e=>setDetails(e.target.value)}/></label>
 <button className="hub-button" disabled={busy}>{pick('Save configuration revision','שמירת גרסת תצורה')}</button><p role="status">{message}</p></form></details>;
}
