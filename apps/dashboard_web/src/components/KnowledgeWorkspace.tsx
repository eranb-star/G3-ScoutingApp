import {Link,useSearchParams} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import {useAccessControl} from '../lib/accessControl';
import {useAdminStatus} from '../lib/useAdminStatus';
import {searchProductionSources} from '../lib/collectedSources';
import FrcKnowledgeWorkspace from './FrcKnowledgeWorkspace';
import RobotResearch from './RobotResearch';
import TeamKnowledgeResults from './TeamKnowledgeResults';
import KnowledgeEvidencePage from '../pages/KnowledgeEvidencePage';
import '../styles/knowledgeWorkspace.css';

export default function KnowledgeWorkspace(){
 const {pick}=useLocalization(),{can}=useAccessControl(),admin=useAdminStatus();
 const [params]=useSearchParams();
 const requested=params.get('view');
 const view=Boolean(params.get('article'))||requested==='library'||requested==='knowledge'?'library':requested==='sources'?'sources':requested==='evidence'?'evidence':requested==='robots'?'robots':'search';
 const evidenceAccess=can('view_evidence_search');
 const tabs=[['search','Search','חיפוש'],['robots','Robots & mechanisms','רובוטים ומנגנונים'],['evidence','Reviewed evidence','מקורות שנבדקו'],['library','Team library','ספריית הקבוצה'],['sources','Documents & updates','מסמכים ועדכונים']];
 return <div className="connected-knowledge">
  <header className="connected-knowledge-heading"><div><span className="hub-eyebrow">G3 6740 · ENGINEERING</span><h1>{pick('FRC knowledge','ידע FRC')}</h1><p>{pick('Find the evidence. Compare the options. Build on what the team knows.','מצאו מקורות. השוו אפשרויות. התקדמו עם הידע של הקבוצה.')}</p></div><Link className="connected-assist-link" to={'/assistant'+(params.get('q')?'?question='+encodeURIComponent(params.get('q')!):'')}>{pick('Ask G3 Assist','שאלו את G3 Assist')} <span aria-hidden="true">↗</span></Link></header>
  <nav className="connected-knowledge-tabs" aria-label={pick('Knowledge workspace','סביבת הידע')}>{tabs.filter(([id])=>id==='library'||evidenceAccess).map(([id,en,he])=><Link key={id} to={'/knowledge?'+new URLSearchParams({...Object.fromEntries(params),view:id,article:''})} aria-current={view===id?'page':undefined}>{pick(en,he)}</Link>)}</nav>
  <div className="connected-knowledge-content">
   {view==='library'?<FrcKnowledgeWorkspace/>:!evidenceAccess?<section className="research-empty"><h2>{pick('Source search access is restricted','הגישה לחיפוש מקורות מוגבלת')}</h2><p>{pick('Your team library remains available. An administrator can manage evidence-search access in Roles & permissions.','ספריית הקבוצה זמינה. מנהל יכול לעדכן הרשאת חיפוש מקורות במסך התפקידים וההרשאות.')}</p><Link to="/knowledge?view=library">{pick('Open team library','פתיחת ספריית הקבוצה')}</Link></section>:view==='search'||view==='robots'?<RobotResearch key={view} admin={admin} sourceSearch={searchProductionSources} initialView={view==='robots'?'robots':'sources'} teamResults={view==='search'?<TeamKnowledgeResults query={(params.get('q')??'').slice(0,200)}/>:undefined}/>:<KnowledgeEvidencePage sourceSearch={searchProductionSources}/>}
  </div>
 </div>;
}
