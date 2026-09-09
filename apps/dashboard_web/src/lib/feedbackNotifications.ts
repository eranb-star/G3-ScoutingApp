import {supabase} from "../supabase";

// The submitting member cannot SELECT administrator-only actions. This narrow
// RPC returns only delivery IDs for their own report; action push checks ownership.
export async function notifyFeedbackReview(reportId:string){
  try{
    const {data,error}=await supabase.rpc("feedback_review_notification_ids",{report:reportId});
    if(error||!data?.length)return false;
    const results=await Promise.all((data??[]).map((row:{action_id:string})=>supabase.functions.invoke("send-action-push",{body:{actionId:row.action_id}})));
    return results.every(result=>!result.error&&!result.data?.error&&!result.data?.failed);
  }catch{return false;}
}
