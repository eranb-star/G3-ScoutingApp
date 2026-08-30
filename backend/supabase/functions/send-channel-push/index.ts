import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
type ServiceAccount = { project_id: string; private_key: string; client_email: string; token_uri?: string };
const b64 = (value: string | Uint8Array) => { const bytes=typeof value==="string"?new TextEncoder().encode(value):value;let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); };

async function accessToken(account: ServiceAccount) {
  const now=Math.floor(Date.now()/1000);const header=b64(JSON.stringify({alg:"RS256",typ:"JWT"}));const claim=b64(JSON.stringify({iss:account.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:account.token_uri??"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));const unsigned=`${header}.${claim}`;
  const raw=Uint8Array.from(atob(account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"")),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",raw,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned));
  const response=await fetch(account.token_uri??"https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${b64(new Uint8Array(signature))}`})});
  if(!response.ok)throw new Error("Firebase authentication failed");return (await response.json()).access_token as string;
}

Deno.serve(async (request) => {
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  try {
    const auth=request.headers.get("Authorization");if(!auth)return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const url=Deno.env.get("SUPABASE_URL")!;const anon=Deno.env.get("SUPABASE_ANON_KEY")!;const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callerClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await callerClient.auth.getUser();if(!user)throw new Error("Invalid session");
    const admin=createClient(url,service);const {messageId}=await request.json();
    const {data:message}=await admin.from("channel_messages").select("id,body,author_id,channel_id,team_channels(name,kind,subteam),team_members!channel_messages_author_id_fkey(display_name)").eq("id",messageId).single();
    if(!message||message.author_id!==user.id)throw new Error("Message not found");
    const channel=message.team_channels as unknown as {name:string;kind:string;subteam:string|null};const author=message.team_members as unknown as {display_name:string};
    const [{data:allMembers},{data:mentionRows}]=await Promise.all([admin.from("team_members").select("id,role,subteam").eq("active",true).neq("id",user.id),admin.from("channel_message_mentions").select("member_id").eq("message_id",message.id)]);
    const mentionedIds=new Set((mentionRows??[]).map(row=>row.member_id));
    const normalized=(value:string|null)=>value?.toLowerCase()==="electronics"?"electrical":value?.toLowerCase();
    const recipients=(allMembers??[]).filter(member=>channel.kind!=="leadership"||["admin","mentor"].includes(member.role)).filter(member=>channel.kind!=="subteam"||normalized(member.subteam)===normalized(channel.subteam));let ids=recipients.map(row=>row.id);
    if(!ids.length)return new Response(JSON.stringify({delivered:0}),{headers:{...cors,"Content-Type":"application/json"}});
    const {data:preferenceRows}=await admin.from("notification_preferences").select("member_id,channel_messages,mentions,private_previews").in("member_id",ids);const preferenceMap=new Map((preferenceRows??[]).map(row=>[row.member_id,row]));ids=ids.filter(id=>mentionedIds.has(id)?preferenceMap.get(id)?.mentions!==false:preferenceMap.get(id)?.channel_messages!==false);
    const {data:tokens}=await admin.from("push_tokens").select("token,member_id").eq("active",true).in("member_id",ids);if(!tokens?.length)return new Response(JSON.stringify({delivered:0}),{headers:{...cors,"Content-Type":"application/json"}});
    const account=JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!) as ServiceAccount;const token=await accessToken(account);const endpoint=`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
    const results=await Promise.all(tokens.map(async row=>{const hidden=preferenceMap.get(row.member_id)?.private_previews===true;const mentioned=mentionedIds.has(row.member_id);return (await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({message:{token:row.token,notification:{title:hidden?"New G3 Team Hub message":mentioned?`${author.display_name} mentioned you in #${channel.name}`:`#${channel.name} · ${author.display_name}`,body:hidden?"Open the app to view it.":message.body.slice(0,180)},android:{priority:mentioned?"HIGH":"NORMAL"},data:{path:`/updates?view=channels&channel=${message.channel_id}&message=${message.id}`,channelId:message.channel_id,messageId:message.id}}})})).ok;}));
    return new Response(JSON.stringify({delivered:results.filter(Boolean).length}),{headers:{...cors,"Content-Type":"application/json"}});
  } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Push failed"}),{status:400,headers:{...cors,"Content-Type":"application/json"}}); }
});
