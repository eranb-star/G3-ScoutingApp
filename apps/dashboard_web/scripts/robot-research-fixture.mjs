import fs from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const researchAdmin='00000000-0000-4000-8000-000000000001',researchMember='00000000-0000-4000-8000-000000000002';
export async function createResearchFixture(){
 const module=process.env.PGLITE_MODULE||fileURLToPath(new URL('../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url));
 const {PGlite}=await import(pathToFileURL(module).href);const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function is_admin()returns boolean language sql stable as $$select auth.uid()='${researchAdmin}'::uuid$$;create table team_members(id uuid primary key,active boolean);create function has_permission(text)returns boolean language sql stable as $$select current_setting('test.allowed',true)='yes' and exists(select 1 from team_members where id=auth.uid() and active)$$;insert into team_members values('${researchAdmin}',true),('${researchMember}',true);create table frc_knowledge_articles(id uuid primary key);grant usage on schema auth to authenticated,service_role;grant select on team_members to authenticated,service_role;`);
 for(const file of ['knowledge_evidence_pilot_20260913.sql','knowledge_source_checks_20260920.sql','robot_research_20260920.sql','robot_research_20260920.sql','robot_research_starter_20260920.sql','robot_research_starter_20260920.sql'])await db.exec(fs.readFileSync(new URL('../../../backend/supabase/'+file,import.meta.url),'utf8'));
 return db;
}
// Used only by the local browser fixture. The live application uses authenticated Supabase RPCs.
export async function researchFixturePlugin(){
 const db=await createResearchFixture();let pending=Promise.resolve();
 const rpcs={add_frc_robot_reference:['p_season','p_url','p_source_title','p_title','p_body','p_locator','p_note'],search_frc_robots:['p_topics','p_mode','p_seasons','p_query','p_exclude','p_page'],frc_research_review_queue:['p_page','p_status'],save_frc_research_topic:['p_id','p_expected','p_name','p_name_he','p_kind','p_synonyms','p_description','p_active'],save_frc_robot_configuration:['p_team','p_season','p_name','p_configuration'],review_frc_topic_evidence:['p_id','p_expected','p_robot','p_present','p_status','p_note'],scan_frc_topic_candidates:['p_topic','p_claim']};
 return {name:'research-database-fixture',api:{topics(){const work=async()=>{await db.exec(`set role authenticated;set test.allowed='yes';set test.uid='${researchAdmin}'`);return (await db.query('select * from frc_research_topics where active order by kind,name')).rows;};const result=pending.then(work,work);pending=result.then(()=>{},()=>{});return result;}},configureServer(server){server.middlewares.use('/__research',async(req,res)=>{let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){res.statusCode=413;res.end();return;}}
  const work=async()=>{try{const payload=JSON.parse(body);await db.exec(`set role authenticated;set test.allowed='yes';set test.uid='${payload.member?researchMember:researchAdmin}'`);let data;
   if(['frc_research_topics','frc_topic_evidence','frc_evidence_sources','frc_evidence_claims'].includes(payload.table))data=(await db.query('select * from '+payload.table+' order by id limit 500 offset $1',[Math.max(0,Number(payload.start)||0)])).rows;
   else{const keys=rpcs[payload.name];if(!keys)throw new Error('Unsupported fixture operation');const args=keys.map(k=>payload.args[k]);data=(await db.query(`select ${payload.name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));
  }catch(e){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:e.message}}));}};
  pending=pending.then(work,work);await pending;
 });}};
}
