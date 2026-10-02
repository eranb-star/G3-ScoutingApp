import type {ResearchRobot} from './robotResearch';
/** A team/year alone cannot identify a particular robot redesign. */
export function matchingLearningRobot(robot:Pick<ResearchRobot,'team'|'season'|'name'|'configuration'>){
 const name=`${robot.name} ${robot.configuration}`.toLowerCase();
 if(robot.season===2026&&robot.team===6328&&/\bdarwin\b/.test(name))return 'darwin';
 if(robot.season===2026&&robot.team===1678&&/\blimestone\b/.test(name))return 'limestone';
 return undefined;
}
export function documentIdentity(url:string){try{const u=new URL(url);u.hash='';return u.href;}catch{return url;}}
export function groupSourcePassages<T extends {url:string;sourceId?:number;version?:string}>(rows:T[]){const groups=new Map<string,T[]>();for(const row of rows){const key=row.sourceId!==undefined?`${row.sourceId}:${row.version??''}`:documentIdentity(row.url);groups.set(key,[...(groups.get(key)??[]),row]);}return [...groups.entries()];}
