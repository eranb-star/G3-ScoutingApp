import {supabase} from '../supabase';
import {readBuildPages} from './robotBuildWorkspace';
type Action={id:string;source_table?:string|null;source_id?:string|null;title?:string;destination?:string|null;relatedIds?:string[];groupedTaskIds?:string[]};
type Group={task_id:string;package_id:string;name:string;project_id:string};
export function groupBuildActions<T extends Action>(actions:T[],groups:Group[],collaborators:{id:string;task_id:string}[]):T[]{
 const grouped=new Map<string,T>();const result:T[]=[];
 for(const action of actions){
  const task=action.source_table==='project_tasks'?action.source_id:action.source_table==='project_task_collaborators'?collaborators.find(c=>c.id===action.source_id)?.task_id:null;
  const group=groups.find(g=>g.task_id===task);
  if(!group){result.push(action);continue;}
  const previous=grouped.get(group.package_id);
  if(previous){previous.relatedIds!.push(action.id);continue;}
  const combined={...action,title:group.name,relatedIds:[action.id],groupedTaskIds:groups.filter(g=>g.package_id===group.package_id).map(g=>g.task_id),destination:`/robot-build?project=${group.project_id}&view=work&package=${group.package_id}`} as T;
  grouped.set(group.package_id,combined);result.push(combined);
 }
 return result;
}
export async function enrichBuildActions<T extends Action>(actions:T[]):Promise<T[]>{
 if(!actions.some(a=>['project_tasks','project_task_collaborators'].includes(a.source_table??'')))return actions;
 try{
  const groups=await readBuildPages<Group>((a,z)=>supabase.rpc('robot_build_action_groups').order('task_id').range(a,z));
  const ids=actions.filter(a=>a.source_table==='project_task_collaborators'&&a.source_id).map(a=>a.source_id!);
  const collaborators:{id:string;task_id:string}[]=[];
  for(let i=0;i<ids.length;i+=100)collaborators.push(...await readBuildPages<{id:string;task_id:string}>((a,z)=>supabase.from('project_task_collaborators').select('id,task_id').in('id',ids.slice(i,i+100)).order('id').range(a,z)));
  return groupBuildActions(actions,groups,collaborators);
 }catch{return actions;} // Keep existing assignments visible if grouping cannot be read.
}
