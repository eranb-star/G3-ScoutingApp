import {useEffect,useState} from 'react';
import {useLocalization} from '../lib/localization';
import {ResearchTopic,topicMatches,toggleSelection} from '../lib/robotResearch';
import {readAllEvidence} from '../lib/knowledgeSources';
export type EvidenceAssociation={topic_id:string;claim_id:string;claim_revision:number;status:string;present:boolean};
export default function EvidenceTopicFilter({onFilter}:{onFilter:(value:{ids:string[];mode:'all'|'any';links:EvidenceAssociation[]})=>void}){
 const {pick}=useLocalization();const [topics,setTopics]=useState<ResearchTopic[]>([]),[links,setLinks]=useState<EvidenceAssociation[]>([]),[ids,setIds]=useState<string[]>([]),[mode,setMode]=useState<'all'|'any'>('all'),[query,setQuery]=useState('');
 useEffect(()=>{let active=true;Promise.all([readAllEvidence<ResearchTopic>('frc_research_topics'),readAllEvidence<EvidenceAssociation>('frc_topic_evidence')]).then(([t,l])=>{if(active){setTopics(t.filter(x=>x.active));setLinks(l.filter(x=>x.status==='confirmed'&&x.present));}}).catch(()=>{/* Optional extension: keep existing evidence usable before migration. */});return()=>{active=false;};},[]);
 useEffect(()=>{onFilter({ids,mode,links});},[ids,mode,links,onFilter]);
 if(!topics.length)return null;
 return <details className="research-reference-topics"><summary>{pick('Filter by reviewed topics','סינון לפי נושאים שנבדקו')} · {ids.length||pick('All topics','כל הנושאים')}</summary><p>{pick('These filters use confirmed topic associations. Keyword search above also searches references that have not been classified.','המסננים משתמשים בשיוכים שאושרו. חיפוש מילות המפתח למעלה כולל גם מקורות שטרם סווגו.')}</p><label>{pick('Find a topic','חיפוש נושא')}<input value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="research-reference-options">{topics.filter(t=>topicMatches(t,query)).map(t=><label key={t.id}><input type="checkbox" checked={ids.includes(t.id)} onChange={()=>setIds(toggleSelection(ids,t.id))}/>{pick(t.name,t.name_he||t.name)}</label>)}</div><label>{pick('Match','התאמה')}<select value={mode} onChange={e=>setMode(e.target.value as 'all'|'any')}><option value="all">{pick('All selected','כל הנבחרים')}</option><option value="any">{pick('Any selected','אחד מהנבחרים')}</option></select></label><button onClick={()=>{setIds([]);setQuery('');}}>{pick('Clear topics','ניקוי נושאים')}</button></details>;
}
