import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {useProjectRefresh} from '../lib/projectRefresh';
export default function ProjectChangeImpact(){
 const {pick}=useLocalization();const[rows,setRows]=useState<{task_id:string;title:string;status:string;href:string}[]>([]),[error,setError]=useState(false);
 async function load(){const r=await supabase.rpc('task_change_impact');setError(!!r.error);if(!r.error)setRows(r.data??[]);}
 useEffect(()=>{void load();},[]);useProjectRefresh(load);
 if(error)return <p role="status">{pick('Upstream status could not be checked. Refresh before progressing work.','לא ניתן לבדוק את מצב המשימות המקדימות. רעננו לפני התקדמות בעבודה.')}</p>;
 const impacted=rows.filter(r=>r.status==='done'||r.status==='in_progress');
 if(!impacted.length)return null;
 return <section className="hub-card"><h2>{pick('Engineering release needs attention','נדרשת בדיקת שחרור הנדסי')}</h2><p>{pick('These tasks or their prerequisites need a current review. Historical completion is retained; open the task and resolve the review before continuing.','משימות אלה או המשימות המקדימות שלהן דורשות ביקורת עדכנית. ההשלמה ההיסטורית נשמרת; פתחו את המשימה וטפלו בביקורת לפני המשך העבודה.')}</p><ul>{impacted.map(r=><li key={r.task_id}><Link to={r.href}>{r.title}</Link></li>)}</ul></section>;
}
