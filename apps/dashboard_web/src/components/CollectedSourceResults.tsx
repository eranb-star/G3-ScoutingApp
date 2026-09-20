import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import {sourceLink,type ResearchFilters} from '../lib/robotResearch';
import type {CollectedSourceResult,CollectedSourceSearch} from '../lib/collectedSources';

export default function CollectedSourceResults({filters,search}:{filters:ResearchFilters;search:CollectedSourceSearch}){
 const {pick}=useLocalization();
 const [page,setPage]=useState(0),[retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<number[]>([]);
 const [result,setResult]=useState<CollectedSourceResult|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 const key=JSON.stringify(filters);
 const hasCriteria=Boolean(filters.query.trim()||filters.topics.length||filters.seasons.length||filters.source||(filters.teams??[]).length);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError(false);setResult(null);
  if(filters.exclude.length){setLoading(false);return()=>controller.abort();}
  const timer=setTimeout(()=>{search(filters,page,controller.signal).then(data=>{if(!controller.signal.aborted)setResult(data);}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},180);
  return()=>{clearTimeout(timer);controller.abort();};
 // The parent remounts this view when shared search filters change, resetting pagination.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,page,retry,search]);
 if(filters.exclude.length)return <div className="research-empty"><h3>{pick('Absence requires reviewed evidence','היעדר דורש מקורות שנבדקו')}</h3><p>{pick('Source text cannot establish that a robot lacked a mechanism. Choose Reviewed robot configurations for this filter, or remove Documented absence to search source passages.','טקסט ממקור אינו יכול לקבוע שמנגנון לא היה ברובוט. בחרו בתצורות רובוט שנבדקו למסנן זה, או הסירו את מסנן ההיעדר כדי לחפש קטעי מקור.')}</p></div>;
 if(result&&!hasCriteria)return <section className="research-empty"><h3>{pick('What are you working on?','על מה אתם עובדים?')}</h3><p>{pick('Search a mechanism, control problem or technical term. Narrow by season, topic or source type when needed.','חפשו מנגנון, בעיית בקרה או מונח טכני. צמצמו לפי עונה, נושא או סוג מקור לפי הצורך.')}</p><div className="research-selection">{['PID','elevator','turret','drivetrain','gripper'].map(q=><Link key={q} to={'/knowledge?view=search&q='+q}>{q}</Link>)}</div><p>{result.sourceCount.toLocaleString()} {pick('indexed source versions. Coverage is incomplete; results link to their original evidence.','גרסאות מקור באינדקס. הכיסוי אינו מלא; התוצאות מקושרות למקורות המקוריים.')}</p></section>;
 return <section className="research-source-results" aria-label={pick('Source passages','קטעי מקור')} aria-busy={loading}>
  <p className="research-source-explanation">{pick('Search the collected text using your topics, keywords and seasons. Matches are source passages, not verified robot facts. “All selected” requires every topic in the same passage.','חיפוש בטקסט שנאסף לפי הנושאים, מילות המפתח והעונות שבחרתם. התוצאות הן קטעי מקור, ולא עובדות רובוט שנבדקו. ״כל הנבחרים״ דורש את כל הנושאים באותו קטע.')}</p>
  {loading?<p role="status">{pick('Searching collected sources…','מחפש במקורות שנאספו…')}</p>:error?<div role="alert" className="research-empty"><h3>{pick('Source search is unavailable','חיפוש המקורות אינו זמין')}</h3><p>{pick('The source index could not be reached. This is not a zero-results search.','לא ניתן לגשת לאינדקס המקורות. אין פירוש הדבר שאין תוצאות.')}</p><button onClick={()=>setRetry(n=>n+1)}>{pick('Retry','ניסיון נוסף')}</button></div>:result&&<>
   <h3 aria-live="polite">{result.count.toLocaleString()} {pick('matching source passages','קטעי מקור תואמים')}</h3>
   {result.generation&&<div className="research-selection"><span>{pick('Select up to six passages to compare or discuss with G3 Assist.','בחרו עד שישה קטעים להשוואה או לדיון עם G3 Assist.')}</span>{selected.length>0&&<><Link to={'/assistant?'+new URLSearchParams({question:filters.query||pick('Compare the selected sources and propose a practical test.','השוו את המקורות שנבחרו והציעו בדיקה מעשית.'),evidence:selected.join(','),generation:result.generation})}>{pick(`Ask with ${selected.length} selected`,`שאלה עם ${selected.length} מקורות נבחרים`)} →</Link><button type="button" onClick={()=>setSelected([])}>{pick('Clear selection','ניקוי הבחירה')}</button></>}</div>}
   <p className="research-coverage">{pick('Index','אינדקס')}: {result.sourceCount.toLocaleString()} {pick('source versions. Repeated text may have multiple citations. Seasons describe source context; coverage is incomplete.','גרסאות מקור. לטקסט חוזר עשויות להיות מספר אסמכתאות. העונות מתארות את הקשר המקור; הכיסוי אינו מלא.')}</p>
   {filters.seasons.length>0&&<p className="research-coverage">{pick('Only sources associated with the selected seasons are shown. Clear Seasons to include general engineering references without an assigned year.','מוצגים רק מקורות המשויכים לעונות שנבחרו. נקו את בחירת העונות כדי לכלול גם מקורות הנדסיים כלליים ללא שנה משויכת.')}</p>}
   {!result.rows.length&&<div className="research-empty"><h3>{pick('No matching collected passages','לא נמצאו קטעים תואמים במקורות שנאספו')}</h3><p>{pick('Try Any selected, fewer keywords or more seasons. This index does not cover every team or every available source.','נסו התאמה לאחד מהנבחרים, פחות מילות מפתח או עונות נוספות. אינדקס זה אינו כולל את כל הקבוצות או את כל המקורות הזמינים.')}</p></div>}
   <div className="research-source-cards">{result.rows.map(row=><article className="research-source-card" key={row.id}>
    {result.generation&&<label className="research-check"><input type="checkbox" checked={selected.includes(row.id)} disabled={!selected.includes(row.id)&&selected.length>=6} onChange={()=>setSelected(ids=>ids.includes(row.id)?ids.filter(id=>id!==row.id):[...ids,row.id])}/>{pick('Select for G3 Assist','בחירה עבור G3 Assist')}</label>}
    <div className="research-source-meta"><span>{row.source_class==='official'?pick('Official documentation','תיעוד רשמי'):row.source_class==='team'?pick('Team / community source','מקור קבוצה / קהילה'):pick('Reference source','מקור עיון')}</span><span>{pick('Not reviewed as a robot fact','לא נבדק כעובדת רובוט')}</span></div>
    <h4><a href={sourceLink(row.url)} target="_blank" rel="noreferrer">{row.title} ↗</a></h4>
    <p className="research-source-context">{row.seasons.length?`${pick('Source seasons','עונות המקור')}: ${row.seasons.join(', ')}`:pick('General engineering reference · no season assigned','מקור הנדסי כללי · ללא עונה משויכת')}{row.scope&&` · ${row.scope}`}</p>
    <blockquote dir="auto">{row.body}</blockquote>
    <a href={sourceLink(row.url)} target="_blank" rel="noreferrer">{pick('Read original passage','קריאת הקטע המקורי')} ↗</a>
    {result.generation&&<Link className="research-evidence-handoff" to={'/assistant?'+new URLSearchParams({question:filters.query||pick('Explain this evidence and suggest a practical next test.','הסבירו את המקור והציעו בדיקה מעשית.'),evidence:String(row.id),generation:result.generation})}>{pick('Discuss this evidence with G3 Assist','דיון במקור עם G3 Assist')} →</Link>}
   </article>)}</div>
   {result.count>10&&<nav className="research-pagination" aria-label={pick('Source result pages','עמודי תוצאות מקורות')}><button disabled={!page} onClick={()=>setPage(n=>n-1)}>{pick('Previous sources','מקורות קודמים')}</button><span>{page+1} / {Math.ceil(result.count/10).toLocaleString()}</span><button disabled={(page+1)*10>=result.count} onClick={()=>setPage(n=>n+1)}>{pick('Next sources','מקורות הבאים')}</button></nav>}
  </>}
 </section>;
}
