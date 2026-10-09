import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {githubReader,privateRobotRepositories} from '../../../backend/supabase/functions/frc-assistant/software-context.ts';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Cache-Control":"no-store"};
function category(repo:any){const value=`${repo.name} ${repo.description??''} ${repo.language??''} ${(repo.topics??[]).join(' ')}`.toLowerCase();if(/cad|onshape|drawing|g-code|design/.test(value))return 'cad';if(/scout|data|strateg|analytic/.test(value))return 'scouting';if(/archive|2023|2024|crescendo/.test(value))return 'archive';if(/robot|swerve|frc|java|wpilib|rebuilt|offseason/.test(value))return 'software';return 'experiments';}
function row(repo:any,purpose?:string){const url=`https://github.com/${repo.full_name}`;return {id:repo.id,name:repo.name,description:repo.description,owner:repo.owner.login,sourceKind:'organization',url,language:repo.language,updatedAt:repo.updated_at,pushedAt:repo.pushed_at,archived:repo.archived,fork:repo.fork,private:repo.private===true,topics:repo.topics??[],openIssues:repo.open_issues_count,defaultBranch:repo.default_branch,category:category(repo),purpose,commitsUrl:`${url}/commits/${encodeURIComponent(repo.default_branch)}`,issuesUrl:`${url}/issues`,releasesUrl:`${url}/releases`};}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const authorization=request.headers.get('Authorization');if(!authorization)return Response.json({error:'Authentication required'},{status:401,headers:cors});
  const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return Response.json({error:'Invalid session'},{status:401,headers:cors});
  const {data:member,error:memberError}=await caller.from('team_members').select('active').eq('id',user.id).maybeSingle();
  if(memberError||!member?.active)return Response.json({error:'Active team membership required'},{status:403,headers:cors});
  const permission=await caller.rpc('has_permission',{requested_permission:'use_private_robot_code'});
  const allowed=!permission.error&&permission.data===true,token=allowed?Deno.env.get('G3_ROBOT_GITHUB_TOKEN'):undefined;
  const body=request.method==='POST'?await request.json().catch(()=>({})):{};
  if(body.action==='check-commit'){
   if(!allowed)return Response.json({error:'Private robot code permission required'},{status:403,headers:cors});
   if(!token)return Response.json({error:'Private GitHub connection is not configured'},{status:503,headers:cors});
   if(!privateRobotRepositories.some(r=>r.repository===body.repository)||typeof body.commit!=='string'||!/^[a-fA-F0-9]{40}$/.test(body.commit))return Response.json({error:'Choose an approved robot repository and full commit SHA'},{status:400,headers:cors});
   try{const read=githubReader(fetch,{token,allowPrivate:true}),meta=await read(body.repository);
    if(String(meta.full_name).toLowerCase()!==body.repository.toLowerCase()||typeof meta.private!=='boolean')throw Error('repository mismatch');
    const result=await read(body.repository+'/commits/'+body.commit);
    if(typeof result.sha!=='string'||result.sha.toLowerCase()!==body.commit.toLowerCase())throw Error('revision mismatch');
    return Response.json({repository:body.repository,revision:result.sha.toLowerCase()},{headers:cors});
   }catch{return Response.json({error:'Exact commit unavailable. Check the repository, commit and access.'},{status:400,headers:cors});}
  }
  const repositories:any[]=[],warnings:string[]=[];
  for(const owner of ['GlueGunAndGlitter','GlueGunGlitter']){
   try{const response=await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`,{headers:{Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('unavailable');const data=await response.json();
    repositories.push(...data.filter((r:any)=>r.private===false&&r.owner?.login?.toLowerCase()===owner.toLowerCase()).map((r:any)=>row(r)));
   }catch{warnings.push(`Public catalogue unavailable for ${owner}.`);}
  }
  let connected=0;
  if(token){for(const project of privateRobotRepositories){try{
    const repo=await githubReader(fetch,{token,allowPrivate:true})(project.repository);
    if(String(repo.full_name).toLowerCase()!==project.repository.toLowerCase()||typeof repo.private!=='boolean')throw Error('identity');
    const existing=repositories.findIndex(r=>`${r.owner}/${r.name}`.toLowerCase()===project.repository.toLowerCase());if(existing>=0)repositories.splice(existing,1);
    repositories.unshift(row(repo,project.purpose));connected++;
   }catch{warnings.push(`Could not connect ${project.repository}. Check repository approval and credential expiry.`);}}}
  return Response.json({repositories,refreshedAt:new Date().toISOString(),privateAccessStatus:!allowed?'permission-required':!token?'setup-required':connected===privateRobotRepositories.length?'connected':'connection-error',warnings},{headers:cors});
 }catch{return Response.json({error:'Repository catalogue unavailable. Please retry.'},{status:502,headers:cors});}
});
