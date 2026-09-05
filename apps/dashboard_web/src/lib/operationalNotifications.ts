import { supabase } from "../supabase";

export async function notifyActionSource(sourceTable:string,sourceId:string){
  const {data}=await supabase.from("team_actions").select("id").eq("source_table",sourceTable).eq("source_id",sourceId).eq("cancelled",false).maybeSingle();
  if(!data?.id)return {delivered:0};
  const result=await supabase.functions.invoke("send-action-push",{body:{actionId:data.id}});
  return result.data??{delivered:0};
}
