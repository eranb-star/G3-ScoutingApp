import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {CadError,parseSource,sha256,seal,unseal,boundedJson,providerReader} from './security.ts';
import {captureSnapshot,inspectEvidence} from './snapshot.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const env=(name:string)=>Deno.env.get(name)||'';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
function configuration(){
 const clientId=env('G3_ONSHAPE_CLIENT_ID'),clientSecret=env('G3_ONSHAPE_CLIENT_SECRET'),encryption=env('G3_ONSHAPE_ENCRYPTION_KEY');
 if(!clientId||!clientSecret||!encryption)throw new CadError('SETUP_REQUIRED','The Onshape connector is not configured yet.',503);
 return {clientId,clientSecret,encryption,redirect:`${env('SUPABASE_URL')}/functions/v1/onshape-connector`};
}
async function exchange(values:Record<string,string>){
 const config=configuration();
 const result=await boundedJson(await fetch('https://oauth.onshape.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:config.clientId,client_secret:config.clientSecret}),redirect:'error',signal:AbortSignal.timeout(20000)}),64000);
 if(typeof result.access_token!=='string'||typeof result.refresh_token!=='string'||!Number.isFinite(result.expires_in)||result.expires_in<=0)throw new CadError('RECONNECT_REQUIRED','Onshape did not return a valid connection.',502);
 return result;
}
async function activeAdmin(db:any,id:string){
 const {data,error}=await db.from('team_members').select('active,role').eq('id',id).maybeSingle();
 if(error||!data?.active||data.role!=='admin')throw new CadError('ACCESS_DENIED','An active G3 admin account is required for this connection.',403);
}
async function connection(db:any,memberId:string){
 const result=await db.from('cad_connections').select('*').eq('member_id',memberId).is('disconnected_at',null).maybeSingle();
 if(result.error)throw new CadError('STORAGE_UNAVAILABLE','CAD connection storage is unavailable.',503);
 if(!result.data)throw new CadError('CONNECT_REQUIRED','Connect your Onshape account first.',409);
 return result.data;
}
async function accessToken(db:any,row:any){
 const config=configuration();
 const credential=await unseal(row.credential,config.encryption,row.id);
 if(Date.parse(row.expires_at)>Date.now()+90000)return credential.access_token;
 const lock=await db.rpc('claim_cad_refresh',{p_id:row.id});
 if(lock.error||lock.data!==true)throw new CadError('CONNECTION_BUSY','The connection is refreshing. Retry shortly.',409);
 try{
  const latest=await db.from('cad_connections').select('*').eq('id',row.id).is('disconnected_at',null).single();
  if(latest.error||!latest.data)throw new CadError('RECONNECT_REQUIRED','Reconnect Onshape.',409);
  const current=await unseal(latest.data.credential,config.encryption,row.id);
  if(Date.parse(latest.data.expires_at)>Date.now()+90000){
   await db.from('cad_connections').update({refresh_lock_until:null}).eq('id',row.id);
   return current.access_token;
  }
  const tokens=await exchange({grant_type:'refresh_token',refresh_token:current.refresh_token});
  const updated=await db.from('cad_connections').update({credential:await seal(tokens,config.encryption,row.id),expires_at:new Date(Date.now()+tokens.expires_in*1000).toISOString(),refresh_lock_until:null,updated_at:new Date().toISOString()}).eq('id',row.id).is('disconnected_at',null).select('id').maybeSingle();
  if(updated.error||!updated.data)throw new CadError('RECONNECT_REQUIRED','Reconnect Onshape to restore access.',409);
  return tokens.access_token;
 }catch(error){
  // A provider may have rotated the refresh token even if the response was lost.
  // Fail closed instead of retrying an ambiguous credential rotation indefinitely.
  await db.from('cad_connections').update({disconnected_at:new Date().toISOString(),credential:{},refresh_lock_until:null}).eq('id',row.id);
  throw error;
 }
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'));
 try{
  const url=new URL(request.url);
  if(request.method==='GET'){
   // Random, expiring, single-use state binds the callback to the initiating admin.
   const state=url.searchParams.get('state')||'';
   if(!/^[a-f0-9]{64}$/.test(state))throw new CadError('INVALID_STATE','Restart the Onshape connection from G3.',400);
   const consumed=await db.from('cad_oauth_states').delete().eq('state_hash',await sha256(state)).gt('expires_at',new Date().toISOString()).select('member_id').maybeSingle();
   if(consumed.error||!consumed.data)throw new CadError('INVALID_STATE','This connection request expired or was already used. Start again in G3.',400);
   await activeAdmin(db,consumed.data.member_id);
   if(url.searchParams.has('error'))throw new CadError('AUTHORIZATION_DECLINED','Onshape authorization was not completed.',400);
   const code=url.searchParams.get('code');if(!code||code.length>4096)throw new CadError('INVALID_CODE','Restart the connection from G3.',400);
   const config=configuration(),tokens=await exchange({grant_type:'authorization_code',code,redirect_uri:config.redirect});
   const previous=await db.from('cad_connections').select('id').eq('member_id',consumed.data.member_id).maybeSingle();
   if(previous.error)throw new CadError('STORAGE_UNAVAILABLE','Connection could not be saved.',503);
   const id=previous.data?.id||crypto.randomUUID();
   const stored=await db.from('cad_connections').upsert({id,member_id:consumed.data.member_id,credential:await seal(tokens,config.encryption,id),expires_at:new Date(Date.now()+tokens.expires_in*1000).toISOString(),disconnected_at:null,refresh_lock_until:null,updated_at:new Date().toISOString()},{onConflict:'member_id'});
   if(stored.error)throw new CadError('STORAGE_UNAVAILABLE','Connection could not be saved. Reconnect from G3.',503);
   return new Response(null,{status:303,headers:{...headers,Location:'https://g3-6740.com/engineering/cad?connected=1'}});
  }
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  const authorization=request.headers.get('Authorization');if(!authorization)throw new CadError('AUTH_REQUIRED','Sign in to G3.',401);
  const caller=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}}});
  const {data:{user}}=await caller.auth.getUser();if(!user)throw new CadError('AUTH_REQUIRED','Sign in to G3.',401);
  await activeAdmin(db,user.id);
  const body=await request.json();
  if(body.action==='status'){
   const result=await db.from('cad_connections').select('id,updated_at,disconnected_at').eq('member_id',user.id).maybeSingle();
   if(result.error)throw new CadError('STORAGE_UNAVAILABLE','CAD connection storage is unavailable.',503);
   return reply({configured:!!(env('G3_ONSHAPE_CLIENT_ID')&&env('G3_ONSHAPE_CLIENT_SECRET')&&env('G3_ONSHAPE_ENCRYPTION_KEY')),connected:!!result.data&&!result.data.disconnected_at,updatedAt:result.data?.updated_at});
  }
  if(body.action==='connect'){
   const config=configuration();
   const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   await db.from('cad_oauth_states').delete().eq('member_id',user.id);
   const saved=await db.from('cad_oauth_states').insert({state_hash:await sha256(state),member_id:user.id,expires_at:new Date(Date.now()+600000).toISOString()});
   if(saved.error)throw new CadError('STORAGE_UNAVAILABLE','Could not start authorization.',503);
   const target=new URL('https://oauth.onshape.com/oauth/authorize');
   target.search=new URLSearchParams({response_type:'code',client_id:config.clientId,redirect_uri:config.redirect,scope:'OAuth2Read',state}).toString();
   return reply({url:target.href});
  }
  const row=await connection(db,user.id);
  if(body.action==='disconnect'){
   const result=await db.from('cad_connections').update({credential:{},disconnected_at:new Date().toISOString(),refresh_lock_until:null}).eq('id',row.id);
   if(result.error)throw new CadError('STORAGE_UNAVAILABLE','Could not disconnect. Retry.',503);
   return reply({disconnected:true,providerGrantRevocationRequired:true});
  }
  if(body.action==='sources'){
   const result=await db.from('cad_sources').select('*').eq('connection_id',row.id).is('archived_at',null).order('created_at',{ascending:false});
   if(result.error)throw new CadError('STORAGE_UNAVAILABLE','Could not read selected designs.',503);
   return reply({sources:result.data});
  }
  const read=providerReader(await accessToken(db,row));
  if(body.action==='snapshot'){
   const source=await db.from('cad_sources').select('*').eq('id',body.sourceId).eq('connection_id',row.id).is('archived_at',null).maybeSingle();
   if(source.error||!source.data)throw new CadError('SOURCE_UNAVAILABLE','Select one of your connected designs.',404);
   const snapshot=await captureSnapshot(source.data,read);
   const inserted=await db.from('cad_snapshots').upsert({source_id:source.data.id,...snapshot},{onConflict:'source_id,microversion',ignoreDuplicates:true});
   if(inserted.error)throw new CadError('STORAGE_UNAVAILABLE','Could not save the design evidence.',503);
   const saved=await db.from('cad_snapshots').select('*').eq('source_id',source.data.id).eq('microversion',snapshot.microversion).single();
   if(saved.error)throw new CadError('STORAGE_UNAVAILABLE','Could not read the saved design evidence.',503);
   return reply({snapshot:{id:saved.data.id,created_at:saved.data.created_at,microversion:saved.data.microversion,...inspectEvidence(saved.data)}});
  }
  if(body.action==='discover'){
   const offset=Number(body.offset??0);
   if(!Number.isInteger(offset)||offset<0||offset>100000)throw new CadError('INVALID_PAGE','Invalid catalogue page.');
   const page=await read(`/documents?offset=${offset}&limit=20&sortColumn=modifiedAt&sortOrder=desc`);
   return reply({items:(page.items||[]).map((item:any)=>({id:item.id,name:item.name,workspaceId:item.defaultWorkspace?.id,modifiedAt:item.modifiedAt})),nextOffset:page.next?offset+20:null});
  }
  if(body.action==='add-source'){
   const source=parseSource(body.url);
   const elements=await read(`/documents/d/${source.documentId}/${source.referenceType}/${source.referenceId}/elements`);
   const element=elements.find((item:any)=>item.id===source.elementId);
   if(!element)throw new CadError('SOURCE_UNAVAILABLE','This design tab was not found.',404);
   if(!['PARTSTUDIO','ASSEMBLY'].includes(element.elementType))throw new CadError('UNSUPPORTED_ELEMENT','Select a Part Studio or Assembly. Sketches inside Part Studios are supported.');
   const saved=await db.from('cad_sources').upsert({connection_id:row.id,document_id:source.documentId,reference_type:source.referenceType,reference_id:source.referenceId,element_id:source.elementId,configuration:source.configuration,name:element.name,element_type:element.elementType,archived_at:null},{onConflict:'connection_id,document_id,reference_type,reference_id,element_id,configuration'}).select('*').single();
   if(saved.error)throw new CadError('STORAGE_UNAVAILABLE','Could not save this design.',503);
   return reply({source:saved.data});
  }
  throw new CadError('INVALID_ACTION','Unsupported CAD action.');
 }catch(error){return error instanceof CadError?reply({error:error.message,code:error.code},error.status):reply({error:'CAD connection could not complete. Retry or reconnect.',code:'CAD_UNAVAILABLE'},503);}
});
