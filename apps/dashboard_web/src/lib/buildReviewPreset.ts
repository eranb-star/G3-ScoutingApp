import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import type {EvidenceItem} from '../components/ReviewEvidence';
export type BuildReviewPreset={revision:string;items:EvidenceItem[];notes:string;release:boolean};
export function useBuildReviewPreset(taskId:string){
 const [preset,setPreset]=useState<BuildReviewPreset|null>(null);
 useEffect(()=>{let active=true;setPreset(null);void(async()=>{
  let r=await supabase.from('robot_build_preparations').select('part_name,part_revision,instructions,line_id,release_task_id,robot_build_work_package_items!inner(package_id)').or(`work_task_id.eq.${taskId},release_task_id.eq.${taskId}`).maybeSingle();
  if(!r.error&&!r.data){
   const lot=await supabase.from('robot_build_lots').select('job_id').eq('task_id',taskId).maybeSingle();
   if(lot.data?.job_id)r=await supabase.from('robot_build_preparations').select('part_name,part_revision,instructions,line_id,release_task_id,robot_build_work_package_items!inner(package_id)').eq('job_id',lot.data.job_id).maybeSingle();
  }
  if(r.error||!r.data?.line_id)return;
  const l=await supabase.from('robot_build_bom_lines').select('source_identity').eq('id',r.data.line_id).maybeSingle();
  if(l.error)return;const source=l.data?.source_identity;
  if(!source?.documentId||!source.elementId||!source.microversion)return;
  const url=`https://cad.onshape.com/documents/${encodeURIComponent(source.documentId)}/m/${encodeURIComponent(source.microversion)}/e/${encodeURIComponent(source.elementId)}${source.configuration?'?configuration='+encodeURIComponent(source.configuration):''}`;
  if(active)setPreset({revision:r.data.part_revision,notes:'',release:r.data.release_task_id===taskId,items:[{title:r.data.part_name,revision:r.data.part_revision,url,artifact_type:'drawing',source_id:`onshape:${source.documentId}:${source.microversion}:${source.elementId}:${source.partId??''}`}]});
 })().catch(()=>{});return()=>{active=false;};},[taskId]);return preset;
}
