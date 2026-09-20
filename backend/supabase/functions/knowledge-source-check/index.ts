import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {assertPdf, discoverDocuments, fetchBounded, MAX_DOCUMENTS, MAX_PDF_BYTES, MAX_CHECK_BYTES} from './discovery.mjs';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store'}});
const checked=async(query:any)=>{const result=await query;if(result.error)throw result.error;return result.data;};
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'POST required'},405);
 try{
  const authorization=request.headers.get('Authorization');if(!authorization)return json({error:'Sign in required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)return json({error:'Sign in required'},401);
  if(!await checked(caller.rpc('can_manage_frc_sources')))return json({error:'Active evidence administrator required'},403);
  const body=await request.json();
  if(body.action==='start'){
   if(!Number.isInteger(body.season)||body.season<1992||body.season>2100)return json({error:'Choose a valid season'},400);
   return json({checkId:await checked(caller.rpc('start_frc_source_check',{p_season:body.season}))});
  }
  if(body.action==='retry'&&typeof body.checkId==='string'&&/^[0-9a-f-]{36}$/i.test(body.checkId))return json({checkId:await checked(caller.rpc('retry_frc_source_check',{p_check:body.checkId}))});
  if(body.action!=='advance'||typeof body.checkId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.checkId))return json({error:'Invalid check request'},400);
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const run=await checked(caller.from('frc_knowledge_checks').select('*').eq('id',body.checkId).single());
  if(run.status!=='running')return json({status:run.status});
  const token=await checked(service.rpc('lease_frc_source_check',{p_check:run.id,p_actor:user.id}));
  if(!token)return json({status:'busy'});
  try{
   // Each request has a bounded budget. Durable pending items can resume after navigation/network loss.
   const items=await checked(service.from('frc_knowledge_check_items').select('*').eq('check_id',run.id).eq('status','pending').order('kind',{ascending:false}).order('id').limit(3));
   for(const item of items){
    // Recheck the actual caller's grants before each outbound operation.
    if(!await checked(caller.rpc('can_manage_frc_sources')))return json({error:'Access changed. Checking stopped.'},403);
    const state=await checked(service.from('frc_knowledge_checks').select('status,lease_token').eq('id',run.id).single());
    if(state.status!=='running'||state.lease_token!==token)break;
    let status='checked',note='',sha:string|null=null,bytes:number|null=null,etag:string|null=null,modified:string|null=null;
    try{
     const transfers=await checked(service.from('frc_knowledge_check_items').select('bytes').eq('check_id',run.id));
     const remainingBytes=MAX_CHECK_BYTES-transfers.reduce((sum:number,row:any)=>sum+Number(row.bytes??0),0);
     if(remainingBytes<=0)throw new Error('The 128 MB check budget was reached. Remaining sources were not downloaded.');
     const previous=item.kind==='document'?await checked(service.from('frc_knowledge_documents').select('etag,last_modified').eq('season',run.season).eq('url',item.url).maybeSingle()):null;
     const result=await fetchBounded(item.url,Math.min(remainingBytes,item.kind==='listing'?2*1024*1024:MAX_PDF_BYTES),fetch,(count:number)=>{bytes=count;},{etag:previous?.etag,modified:previous?.last_modified});
     etag=result.etag;modified=result.modified;
     if(item.kind==='listing'){
      if(!/text\/html/i.test(result.type))throw new Error('The publication page did not return HTML.');
      const {documents}=discoverDocuments(new TextDecoder().decode(result.data),result.url,run.season);
      const existing=await checked(service.from('frc_knowledge_check_items').select('url').eq('check_id',run.id));
      const known=new Set(existing.map((i:any)=>i.url));const remaining=Math.max(0,MAX_DOCUMENTS-existing.filter((i:any)=>!i.url.includes('www.firstinspires.org')).length);
      const prior=new Map<string,string>();for(let offset=0;;offset+=500){const rows=await checked(service.from('frc_knowledge_documents').select('url,checked_at').eq('season',run.season).order('id').range(offset,offset+499));for(const row of rows)prior.set(row.url,row.checked_at);if(rows.length<500)break;}
      const additions=documents.filter((d:any)=>!known.has(d.url)).sort((a:any,b:any)=>(prior.get(a.url)??'').localeCompare(prior.get(b.url)??''));const selected=additions.slice(0,remaining);
      if(selected.length)await checked(service.from('frc_knowledge_check_items').upsert(selected.map((d:any)=>({check_id:run.id,url:d.url,title:d.title,kind:'document',status:d.supported?'pending':'skipped',note:d.supported?'':'This file format is linked only; open the publisher’s original.',finished_at:d.supported?null:new Date().toISOString()})),{onConflict:'check_id,url',ignoreDuplicates:true}));
      note=`${documents.length} season-specific document links found. Documents stay on the publisher’s site.`;
      if(!documents.length){status='skipped';note=`No ${run.season} document links found here. Publication may be pending or the page structure may have changed.`;}
      if(additions.length>remaining){status='skipped';note=`The ${MAX_DOCUMENTS}-document check limit was reached. Some links were not checked; the season is not complete.`;}
     }else{
      if(!new RegExp(`^/frc${run.season}/`,'i').test(new URL(result.url).pathname))throw new Error('The document redirected to another season; it was not accepted.');
      if(result.notModified){status='not_modified';bytes=0;note='Publisher confirms the document is unchanged. No PDF was downloaded.';}
      else{assertPdf(result.data);bytes=result.data.byteLength;
       sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',result.data)),b=>b.toString(16).padStart(2,'0')).join('');
       status='fetched';note='Source fingerprint checked. Document content has not been indexed or reviewed.';}
     }
    }catch(error){status='failed';note=error instanceof Error?error.message:'Source could not be checked. Retry later.';}
    if(!await checked(caller.rpc('can_manage_frc_sources')))return json({error:'Access changed. Checking stopped.'},403);
    await checked(service.rpc('finish_frc_check_item',{p_check:run.id,p_lease:token,p_item:item.id,p_status:status,p_note:note,p_sha:sha,p_bytes:bytes,p_etag:etag,p_modified:modified}));
   }
  }finally{await checked(service.rpc('release_frc_source_check',{p_check:run.id,p_lease:token}));}
  const finished=await checked(caller.from('frc_knowledge_checks').select('status').eq('id',run.id).single());return json(finished);
 }catch(error){console.error('Knowledge check failed',error instanceof Error?error.message:'database or request failure');return json({error:'The check could not continue. Saved progress is retained; refresh and resume.'},500);}
});
