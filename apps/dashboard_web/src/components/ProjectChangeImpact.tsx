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
 return <section className="hub-card"><h2>{pick('Upstream work needs attention','נדרשת התייחסות לעבודה מקדימה')}</h2><p>{pick('These tasks have unfinished or unapproved upstream work. Completed work is retained; review its prerequisites before continuing.','למשימות אלה עבודה מקדימה שלא הושלמה או לא אושרה. העבודה שהושלמה נשמרת; בדקו את המשימות המקדימות לפני המשך העבודה.')}</p><ul>{impacted.map(r=><li key={r.task_id}><Link to={r.href}>{r.title}</Link></li>)}</ul></section>;
}
