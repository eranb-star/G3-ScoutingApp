import {useNavigate} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import type {TaskDependency} from './TaskDependencies';
export default function HomeDependencyBlockers({edges,error}:{edges:TaskDependency[]|undefined;error:boolean}){
 const {pick}=useLocalization(),navigate=useNavigate();
 const groups=new Map<string,{edge:TaskDependency;count:number}>();for(const e of edges??[]){if(!e.waiting)continue;const g=groups.get(e.prerequisite_id);if(g)g.count++;else groups.set(e.prerequisite_id,{edge:e,count:1});}
 if(!error&&!groups.size)return null;
 return <section className="hub-card home-dependency-blockers"><h2>{pick('Waiting on other work','ממתינים למשימות מקדימות')}</h2>{error?<p role="status">{pick('Dependency status could not be refreshed.','לא ניתן לרענן את מצב התלויות.')}</p>:<details><summary>{pick(`${groups.size} prerequisites need attention`,`${groups.size} משימות מקדימות דורשות תשומת לב`)}</summary>{[...groups.values()].map(({edge:e,count})=><div className="dependency-row" key={e.prerequisite_id}><div><strong>{e.title??pick('Restricted prerequisite','משימה מקדימה מוגבלת לצפייה')}</strong><small>{e.owner??pick('Unassigned','ללא אחראי')} · {e.subteam??''}</small><small>{pick(`Affects ${count} visible tasks`,`משפיעה על ${count} משימות גלויות`)}{e.unavailable?pick(' · Review unavailable source',' · יש לבדוק מקור שאינו זמין'):e.due_at&&Date.parse(e.due_at)<Date.now()?pick(' · Overdue',' · באיחור'):''}</small></div>{e.href?<button type="button" onClick={()=>navigate(e.href!)}>{pick('Open','פתיחה')}</button>:null}</div>)}</details>}</section>;
}
