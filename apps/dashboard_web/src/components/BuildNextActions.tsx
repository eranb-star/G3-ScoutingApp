import {Link} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import type {BuildTask} from './BuildTaskQueue';

export default function BuildNextActions({projectId,tasks,canManage,loading,error}:{projectId:string;tasks:BuildTask[];canManage:boolean;loading:boolean;error:string}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const active=tasks.filter(t=>!t.archived&&t.status!=='done');
 const mine=active.filter(t=>t.assignee_id===profile?.id);
 const blocked=active.filter(t=>t.status==='blocked');
 const unassigned=active.filter(t=>!t.assignee_id);
 const route=(view:string,extra='')=>`/robot-build?project=${projectId}&view=${view}${extra}`;
 return <section className="build-next-actions">
  <header><div><small>{pick('YOUR NEXT STEP','הצעד הבא שלך')}</small><h2>{pick(canManage?'Keep the build moving':'My assigned work',canManage?'מקדמים את הבנייה':'העבודה שהוקצתה לי')}</h2></div><Link to={route('work','&queue=inspections')}>{pick('Open my review queue','פתיחת תור הבדיקות שלי')} →</Link></header>
  {loading?<p role="status">{pick('Loading assigned work…','טוען עבודה שהוקצתה…')}</p>:error?<p role="alert">{error}</p>:<>
   {canManage&&<div className="build-attention-links"><Link to={route('work','&queue=team&filter=blocked')}><strong>{blocked.length}</strong>{pick('Blocked tasks','משימות חסומות')}</Link><Link to={route('work','&queue=team&filter=unassigned')}><strong>{unassigned.length}</strong>{pick('Need an owner','ממתינות לאחראי')}</Link><Link to={route('parts')}>{pick('Plan parts and sourcing','תכנון חלקים ומקורות')} →</Link></div>}
   <h3>{pick('Continue my work','המשך העבודה שלי')}</h3>
   {mine.length?<ul className="build-next-list">{mine.slice(0,5).map(t=><li key={t.id}><Link to={route('work',`&task=${t.id}&queue=mine`)}><strong>{t.title}</strong><span>{t.status==='blocked'?pick('Blocked · open to resolve','חסום · פתיחה לטיפול'):pick('Open instructions and next action','פתיחת הוראות והפעולה הבאה')} →</span></Link></li>)}</ul>:<div className="build-empty"><strong>{pick('No open work assigned to you','אין עבודה פתוחה שהוקצתה לך')}</strong><p>{canManage?pick('Start with the parts this build needs, then plan and assign their work.','התחילו בחלקים הנדרשים לבנייה, ואז תכננו והקצו עבודה.'):pick('Your team leader assigns work here. You can browse the team queue to see what is underway.','מוביל/ת הצוות מקצים כאן עבודה. ניתן לעיין בתור הצוות כדי לראות מה מתבצע.')}</p><Link to={route(canManage?'parts':'work',canManage?'':'&queue=team')}>{pick(canManage?'Open assemblies & parts':'View team work',canManage?'פתיחת מכלולים וחלקים':'הצגת עבודת הצוות')} →</Link></div>}
   {mine.length>5&&<Link to={route('work','&queue=mine')}>{pick('View all my work','הצגת כל העבודה שלי')} ({mine.length})</Link>}
  </>}
 </section>;
}
