import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
type ServiceAccount={project_id:string;private_key:string;client_email:string;token_uri?:string};
const b64=(value:string|Uint8Array)=>{const bytes=typeof value==="string"?new TextEncoder().encode(value):value;let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");};
const normalize=(value:string|null)=>String(value??"").trim().toLowerCase().replaceAll("&","and").replace(/\s+/g," ");

async function accessToken(account:ServiceAccount){
  const now=Math.floor(Date.now()/1000),header=b64(JSON.stringify({alg:"RS256",typ:"JWT"})),claim=b64(JSON.stringify({iss:account.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:account.token_uri??"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})),unsigned=`${header}.${claim}`;
  const raw=Uint8Array.from(atob(account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"")),character=>character.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",raw,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned));
  const response=await fetch(account.token_uri??"https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${b64(new Uint8Array(signature))}`})});
  if(!response.ok)throw new Error("Firebase authentication failed");return (await response.json()).access_token as string;
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const authorization=request.headers.get("Authorization");if(!authorization)return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const caller=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}}}),admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:{user}}=await caller.auth.getUser();if(!user)throw new Error("Invalid session");
    const {actionId}=await request.json();
    const {data:action}=await admin.from("team_actions").select("id,title,details,action_type,target_type,target_value,destination,priority,created_by,cancelled").eq("id",actionId).single();
    if(!action||action.cancelled)throw new Error("Responsibility not found");
    const {data:callerMember}=await admin.from("team_members").select("role,active").eq("id",user.id).single();
    if(!callerMember?.active||!(action.created_by===user.id||["admin","mentor","team_leader"].includes(callerMember.role)))throw new Error("Not authorized to notify this responsibility");
    const {data:members}=await admin.from("team_members").select("id,subteam,subteams").eq("active",true);
    const recipients=(members??[]).filter(member=>member.id!==user.id).filter(member=>action.target_type==="all"||action.target_type==="member"&&member.id===action.target_value||action.target_type==="subteam"&&[...(member.subteams??[]),member.subteam].some(team=>normalize(team)===normalize(action.target_value)));
    if(!recipients.length)return new Response(JSON.stringify({delivered:0}),{headers:{...cors,"Content-Type":"application/json"}});
    const ids=recipients.map(member=>member.id),preferenceKey=action.action_type==="meeting"?"meeting_reminders":"assignments";
    const [{data:preferences},{data:tokens}]=await Promise.all([admin.from("notification_preferences").select("member_id,assignments,meeting_reminders,private_previews").in("member_id",ids),admin.from("push_tokens").select("token,member_id").eq("active",true).in("member_id",ids)]);
    const preferenceMap=new Map((preferences??[]).map(row=>[row.member_id,row])),eligible=(tokens??[]).filter(row=>preferenceMap.get(row.member_id)?.[preferenceKey]!==false);
    if(!eligible.length)return new Response(JSON.stringify({delivered:0}),{headers:{...cors,"Content-Type":"application/json"}});
    const account=JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!) as ServiceAccount,token=await accessToken(account),endpoint=`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
    const results=await Promise.all(eligible.map(async row=>{const hidden=preferenceMap.get(row.member_id)?.private_previews===true;return (await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({message:{token:row.token,notification:{title:hidden?"New G3 responsibility":action.title,body:hidden?"Open the app to view it.":String(action.details??"A new responsibility needs your attention.").slice(0,180)},android:{priority:action.priority==="urgent"||action.priority==="high"?"HIGH":"NORMAL"},data:{path:action.destination??"/updates?view=inbox",actionId:action.id}}})})).ok;}));
    return new Response(JSON.stringify({delivered:results.filter(Boolean).length}),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:"Push failed"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});}
});
