import { supabase } from "../supabase";

export async function notifyActionSource(sourceTable:string,sourceId:string){
  const {data}=await supabase.from("team_actions").select("id").eq("source_table",sourceTable).eq("source_id",sourceId).eq("cancelled",false).maybeSingle();
  if(!data?.id)return {delivered:0};
  const result=await supabase.functions.invoke("send-action-push",{body:{actionId:data.id}});
  return result.data??{delivered:0};
}

export async function notifyActionsBySourceId(sourceId:string){
  const {data}=await supabase.from("team_actions").select("id").eq("source_id",sourceId).eq("cancelled",false);
  if(!data?.length)return {delivered:0,failed:0};
  const results=await Promise.all(data.map(action=>supabase.functions.invoke("send-action-push",{body:{actionId:action.id}})));
  return {delivered:results.reduce((total,result)=>total+Number(result.data?.delivered??0),0),failed:results.filter(result=>result.error).length};
}
