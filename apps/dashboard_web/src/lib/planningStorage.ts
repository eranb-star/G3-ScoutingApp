import {parsePlanningDraft,type PlanningDraft} from './planningDraft';
import {evaluateRoute,type RoutePoint} from './autonomousPlanning';
export type PlanningWorkspace={schema:1;draft:PlanningDraft;candidates:{id:string;points:RoutePoint[]}[];maxCameras:number};
type Store=Pick<Storage,'getItem'|'setItem'>;
export function planningStorageKey(profile:{length:number;width:number;speed:number;turn:number}){
 return `g3.engineering.workspace.v1:${[profile.length,profile.width,profile.speed,profile.turn].join(':')}`;
}
export function parsePlanningWorkspace(text:string):PlanningWorkspace{
 if(text.length>750000)throw Error('Workspace exceeds 750 KB');
 const value=JSON.parse(text);
 if(value?.schema!==1||!Array.isArray(value.candidates)||value.candidates.length>20||![1,2,3].includes(value.maxCameras))throw Error('Unsupported planning workspace');
 const draft=parsePlanningDraft(JSON.stringify(value.draft));
 const ids=new Set<string>();
 const candidates=value.candidates.map((c:{id:string;points:RoutePoint[]})=>{
  if(!c||typeof c.id!=='string'||!c.id.trim()||c.id.length>80||ids.has(c.id))throw Error('Invalid candidate identity');
  ids.add(c.id);evaluateRoute(draft.season,draft.robot,c.points);
  return {id:c.id,points:structuredClone(c.points)};
 });
 return {schema:1,draft,candidates,maxCameras:value.maxCameras};
}
export function readPlanningWorkspace(store:Store,key:string){
 const raw=store.getItem(key);return raw===null?null:parsePlanningWorkspace(raw);
}
export function writePlanningWorkspace(store:Store,key:string,value:PlanningWorkspace){
 const raw=JSON.stringify(value);parsePlanningWorkspace(raw);store.setItem(key,raw);
}
