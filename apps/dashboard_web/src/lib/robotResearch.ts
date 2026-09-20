export type ResearchTopic={id:string;name:string;name_he:string;kind:'mechanism'|'subject';synonyms:string[];description:string;active:boolean;revision:number};
export type RobotFact={id:string;topic_id:string;topic_name:string;topic_name_he:string;present:boolean;title:string;body:string;locator:string;url:string;source_title:string;source_revision:string;checked_at:string};
export type ResearchRobot={id:string;team:number;season:number;name:string;configuration:string;facts:RobotFact[]};
export type RobotSearch={total:number;rows:ResearchRobot[];coverage:{season:number;configurations:number}[]};
export type ResearchFilters={topics:string[];exclude:string[];seasons:number[];mode:'all'|'any';query:string;page:number;source?:string;teams?:number[]};
export function researchFilters(params:URLSearchParams):ResearchFilters{
 const list=(key:string)=>[...new Set((params.get(key)??'').split(',').filter(Boolean))].slice(0,50);
 return {topics:list('topics'),exclude:list('absent'),seasons:list('years').map(Number).filter(y=>Number.isInteger(y)&&y>=1992&&y<=2100),teams:list('teams').map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<100000),source:['official','team','other'].includes(params.get('source')??'')?params.get('source')!:'',mode:params.get('match')==='any'?'any':'all',query:(params.get('q')??'').slice(0,200),page:Math.min(10000,Math.max(0,Number.parseInt(params.get('page')??'0')||0))};
}
export function filterParams(current:URLSearchParams,patch:Partial<ResearchFilters>){
 const filters={...researchFilters(current),page:0,...patch},next=new URLSearchParams(current);next.set('view',current.get('view')==='robots'?'robots':'search');
 for(const [key,value] of Object.entries({topics:filters.topics.join(','),absent:filters.exclude.join(','),years:filters.seasons.join(','),teams:(filters.teams??[]).join(','),source:filters.source??'',match:filters.mode,q:filters.query,page:filters.page?String(filters.page):''})){
  if(value)next.set(key,value);else next.delete(key);
 }return next;
}
export function toggleSelection<T>(items:T[],value:T){return items.includes(value)?items.filter(x=>x!==value):[...items,value];}
export function topicMatches(topic:ResearchTopic,query:string){const text=[topic.name,topic.name_he,...topic.synonyms].join(' ').toLocaleLowerCase();return query.trim().toLocaleLowerCase().split(/\s+/).every(word=>text.includes(word));}
export function sourceLink(url:string){try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?parsed.href:undefined;}catch{return undefined;}}
