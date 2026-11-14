import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useMemberAuth} from './memberAuth';
import {readBuildPages} from './robotBuildWorkspace';
export function useBuildParticipation(projectId:string){
 const {profile}=useMemberAuth();const [tasks,setTasks]=useState<string[]>([]);
 useEffect(()=>{let active=true;setTasks([]);if(profile?.id)void Promise.all([
  readBuildPages<{task_id:string}>((a,z)=>supabase.from('project_task_collaborators').select('task_id,project_tasks!inner(project_id)').eq('member_id',profile.id).eq('project_tasks.project_id',projectId).order('task_id').range(a,z)),
  readBuildPages<{work_task_id:string;release_task_id:string}>((a,z)=>supabase.from('robot_build_preparations').select('id,work_task_id,release_task_id,robot_build_work_package_items!inner(package_id)').eq('project_id',projectId).order('id').range(a,z))
 ]).then(([rows,prepared])=>{const allowed=new Set(prepared.flatMap(p=>[p.work_task_id,p.release_task_id]));if(active)setTasks(rows.filter(r=>allowed.has(r.task_id)).map(r=>r.task_id));}).catch(()=>{if(active)setTasks([]);});return()=>{active=false;};},[projectId,profile?.id]);
 return tasks;
}
