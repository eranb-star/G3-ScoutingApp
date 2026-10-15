import { supabase } from "../supabase";

export async function notifyActionSource(sourceTable:string,sourceId:string){
  const {data}=await supabase.from("team_actions").select("id").eq("source_table",sourceTable).eq("source_id",sourceId).eq("cancelled",false).maybeSingle();
  if(!data?.id)return {delivered:0};
  const result=await supabase.functions.invoke("send-action-push",{body:{actionId:data.id}});
  return result.data??{delivered:0};
}

export async function notifyActionsBySourceId(sourceId:string){
  const {data,error}=await supabase.from("team_actions").select("id").eq("source_id",sourceId).eq("cancelled",false);
  if(error||!data?.length)return {delivered:0,failed:1};
  const results=await Promise.all(data.map(action=>supabase.functions.invoke("send-action-push",{body:{actionId:action.id}})));
  return {delivered:results.reduce((total,result)=>total+Number(result.data?.delivered??0),0),failed:results.reduce((n,result)=>n+(result.error?1:Number(result.data?.failed??0)),0)};
}

export async function notifyAbsenceRequest(sourceId:string){
 try {
  const {data,error}=await supabase.rpc('absence_notification_action_ids',{p_request:sourceId});
  if(error||!data?.length)return {delivered:0,failed:1};
  const results=await Promise.allSettled((data as {action_id:string}[]).map(a=>supabase.functions.invoke('send-action-push',{body:{actionId:a.action_id}})));
  return results.reduce((total,result)=>{
   if(result.status==='rejected'||result.value.error||result.value.data?.error)return {...total,failed:total.failed+1};
   return {delivered:total.delivered+Number(result.value.data?.delivered??0),failed:total.failed+Number(result.value.data?.failed??0)};
  },{delivered:0,failed:0});
 }catch{return {delivered:0,failed:1};}
}
