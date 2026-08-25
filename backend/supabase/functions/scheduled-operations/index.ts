import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{"Content-Type":"application/json"}});
const israelParts = (date:Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).map(part=>[part.type,part.value]));

Deno.serve(async request => {
  try {
    const cronSecret=Deno.env.get("CRON_SECRET");
    if(!cronSecret || request.headers.get("x-cron-secret")!==cronSecret) return json({error:"Unauthorized"},401);
    const url=Deno.env.get("SUPABASE_URL")!; const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    await db.rpc("close_stale_workshop_sessions");
    const now=new Date(); const in45=new Date(now.getTime()+45*60000); const in75=new Date(now.getTime()+75*60000);
    const {data:meetings}=await db.from("team_meetings").select("id,title,starts_at").eq("status","scheduled").gte("starts_at",in45.toISOString()).lt("starts_at",in75.toISOString());
    const created:string[]=[];
    for(const meeting of meetings??[]){
      const runKey=`meeting:${meeting.id}:60m`;
      const {error:claimError}=await db.from("automation_runs").insert({run_key:runKey,kind:"meeting_reminder"});
      if(claimError) continue;
      const time=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",weekday:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(meeting.starts_at));
      const {data:announcement}=await db.from("announcements").insert({title:`Reminder: ${meeting.title}`,body:`The meeting starts in about one hour (${time}, Israel time).`,audience:"all",priority:"important",meeting_id:meeting.id,created_by:(await db.from("team_members").select("id").eq("role","admin").eq("active",true).limit(1).single()).data?.id}).select("id").single();
      if(announcement){created.push(announcement.id);await fetch(`${url}/functions/v1/send-push`,{method:"POST",headers:{"Content-Type":"application/json","x-cron-secret":cronSecret},body:JSON.stringify({announcementId:announcement.id})});}
    }
    const local=israelParts(now); const reportKinds:Array<[string,boolean,string,number]>=[
      ["weekly",local.weekday==="Mon","Weekly attendance summary",7],
      ["monthly",local.day==="01","Monthly attendance summary",31],
      ["quarterly",local.day==="01"&&["01","04","07","10"].includes(local.month),"Quarterly attendance summary",92],
    ];
    if(local.hour==="08"&&Number(local.minute)<15){for(const [kind,due,title,days] of reportKinds){if(!due)continue;const period=`${local.year}-${local.month}-${local.day}`;const {error:claimError}=await db.from("automation_runs").insert({run_key:`report:${kind}:${period}`,kind:`${kind}_report`});if(claimError)continue;const since=new Date(now.getTime()-days*86400000);const {data:records}=await db.from("attendance_records").select("checked_in_at,checked_out_at").gte("checked_in_at",since.toISOString());const hours=(records??[]).reduce((sum,row)=>sum+Math.max(0,((row.checked_out_at?new Date(row.checked_out_at):now).getTime()-new Date(row.checked_in_at).getTime())/3600000),0);const adminId=(await db.from("team_members").select("id").eq("role","admin").eq("active",true).limit(1).single()).data?.id;if(!adminId)continue;const {data:a}=await db.from("announcements").insert({title,body:`${records?.length??0} attendance records and ${hours.toFixed(1)} verified workshop hours in this period. Open Admin Reports for details.`,audience:"admins",priority:"normal",created_by:adminId}).select("id").single();if(a){created.push(a.id);await fetch(`${url}/functions/v1/send-push`,{method:"POST",headers:{"Content-Type":"application/json","x-cron-secret":cronSecret},body:JSON.stringify({announcementId:a.id})});}}}
    return json({ok:true,created:created.length});
  } catch(error){console.error(error instanceof Error?error.message:"Scheduled operations failed");return json({error:"Scheduled operations failed"},500);}
});
