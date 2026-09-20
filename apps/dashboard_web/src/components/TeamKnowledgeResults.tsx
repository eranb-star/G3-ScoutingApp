import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
type Result={id:string;kind:'article'|'issue';title:string;body:string;subsystem:string;verified:boolean};
export default function TeamKnowledgeResults({query}:{query:string}){
 const {pick}=useLocalization();const [rows,setRows]=useState<Result[]>([]),[state,setState]=useState('loading');
 useEffect(()=>{const controller=new AbortController();setRows([]);setState('loading');
  if(!query.trim()){setState('idle');return()=>controller.abort();}
  void supabase.rpc('search_frc_team_knowledge',{p_query:query,p_limit:6}).abortSignal(controller.signal).then(({data,error})=>{if(controller.signal.aborted)return;setState(error?'error':'ready');setRows(error?[]:data as Result[]);});
  return()=>controller.abort();
 },[query]);
 if(!query.trim())return null;
 if(state==='ready'&&rows.length===0)return null;
 return <section className="team-knowledge-results" aria-label={pick('Team knowledge matches','תוצאות ידע הקבוצה')}>
 <h2>{pick('From our team','מתוך הקבוצה שלנו')}</h2>
 <p>{pick('Relevant saved articles and resolved issues. Historical-season filters below apply to external source passages.','מאמרים שמורים ותקלות שנפתרו. מסנני העונה ההיסטוריים שבהמשך חלים על קטעי המקורות החיצוניים.')}</p>
 {state==='loading'?<p role="status">{pick('Searching team knowledge…','מחפש בידע הקבוצה…')}</p>:state==='error'?<p role="alert">{pick('Team knowledge search is unavailable. External source results remain separate below.','חיפוש ידע הקבוצה אינו זמין. תוצאות המקורות החיצוניים מוצגות בנפרד בהמשך.')}</p>:rows.length===0?<p>{pick('No matching saved team knowledge.','לא נמצא ידע שמור תואם בקבוצה.')}</p>:<div className="team-knowledge-grid">{rows.map(row=><article key={row.kind+row.id}><small>{row.kind==='issue'?pick('Resolved issue','תקלה שנפתרה'):row.verified?pick('Reviewed team article','מאמר קבוצה שנבדק'):pick('Team article · awaiting review','מאמר קבוצה · ממתין לבדיקה')}</small><h3><Link to={row.kind==='article'?'/knowledge?view=library&article='+row.id:'/robot-issues?issue='+row.id}>{row.title}</Link></h3><p dir="auto">{row.body.slice(0,400)}</p></article>)}</div>}
 </section>;
}
