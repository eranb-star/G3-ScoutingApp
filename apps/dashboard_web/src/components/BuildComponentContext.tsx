import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {readBuildPages} from '../lib/robotBuildWorkspace';
type LinkRow={id:string;kit_id:string;created_at:string;robot_build_kits:{name:string;retired_at:string|null;project_tasks:{project_id:string}}};
export default function BuildComponentContext({componentId}:{componentId:string}){
 const {pick}=useLocalization(),[rows,setRows]=useState<LinkRow[]|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setRows(null);setError(false);void readBuildPages<LinkRow>((a,z)=>supabase.from('robot_build_component_links').select('id,kit_id,created_at,robot_build_kits!inner(name,retired_at,project_tasks!robot_build_kits_task_id_fkey!inner(project_id))').eq('component_id',componentId).order('id').range(a,z).returns<LinkRow[]>()).then(r=>{if(active)setRows(r);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[componentId,retry]);
 return <section><h3>{pick('Robot Build history','היסטוריית בניית הרובוט')}</h3>{error?<p role="alert">{pick('Build links could not be checked.','לא ניתן לבדוק קישורים לבנייה.')} <button onClick={()=>setRetry(n=>n+1)}>{pick('Retry','ניסיון חוזר')}</button></p>:!rows?<p role="status">{pick('Checking physical identity links…','בודק קישורי זהות פיזית…')}</p>:!rows.length?<p>{pick('No explicit build link recorded. Similar names or part numbers do not establish physical identity.','לא נרשם קישור מפורש לבנייה. שמות או מספרי חלק דומים אינם מוכיחים זהות פיזית.')}</p>:<ul>{rows.map(r=><li key={r.id}><Link to={`/robot-build?project=${r.robot_build_kits.project_tasks.project_id}&view=assembly`}>{r.robot_build_kits.name}</Link> · {r.robot_build_kits.retired_at?pick('Removed / historical installation','הוסרה / התקנה היסטורית'):pick('Recorded installation','התקנה שנרשמה')}</li>)}</ul>}</section>;
}
