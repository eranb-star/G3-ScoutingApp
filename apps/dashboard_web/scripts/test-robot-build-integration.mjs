import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.PGLITE_MODULE ??= new URL('../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
process.env.G3_ENGINEERING_FIXTURE='1';
await import('./test-engineering-records.mjs');
const {db,admin,student,other,project}=await import('./test-project-review-gates.mjs');
const first=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
const as=id=>db.exec(`set role authenticated;set test.uid='${id}'`);
await db.exec('reset role');
await db.exec(fs.readFileSync(new URL('../../../backend/supabase/robot_build_jobs_20261009.sql',import.meta.url),'utf8'));
await db.query("update team_projects set status='active' where id=$1",[project]);
await db.query("update team_members set active=true,role='admin' where id=$1",[other]);
const task=async title=>(await first('insert into project_tasks(project_id,title,assignee_id,created_by)values($1,$2,$3,$3)returning id',[project,title,student])).id;
const release=await task('Release manufacturing drawing'),work=await task('Manufacture four brackets');
await as(admin);
const asset=(await first('select register_project_asset($1,$2,$3,$4) id',[project,'BUILD-001','Bracket batch','prototype'])).id;
const designed=(await first('select create_tracked_configuration($1,$2,$3,$4,$5,$6,$7,$8,$9) id',[project,'Bracket design','A','designed','Controlled drawing A',null,null,'Not applicable','Not applicable'])).id;
const built=(await first('select create_tracked_configuration($1,$2,$3,$4,$5,$6,$7,$8,$9) id',[project,'Bracket batch','A','as_built','Four manufactured brackets',asset,designed,'Not applicable','Caliper calibration 001'])).id;
async function configure(id,stage){
 await as(admin);
 await db.query('select configure_engineering_requirements($1,$2,$3,$4)',[id,other,[{requirement:'Dimensions',acceptance:'Matches controlled drawing',method:stage==='qc_accepted'?'test':'inspection'}],'Controlled build acceptance']);
 await db.query('select configure_project_review_stage($1,$2,$3)',[id,stage,'Build lifecycle integration']);
}
async function submit(id,rev){
 await as(student);
 const current=(await first('select project_review_context($1) data',[id])).data[0]?.submission?.id??null;
 await db.query('select submit_engineering_review($1,$2,$3,$4,$5)',[id,rev,[{title:'Controlled evidence',revision:rev,url:'https://example.com/immutable/'+rev,artifact_type:'drawing',source_id:'fixture-'+id+'-'+rev}],current,'Inspect exact revision']);
 return (await first('select project_review_context($1) data',[id])).data[0].submission;
}
async function approve(id,s){
 await as(other);
 await db.query('select check_engineering_artifact($1,$2,$3,$4)',[s.id,0,'verified','Matched controlled evidence']);
 await db.query('select record_structured_requirement_result($1,$2,$3,$4,$5,$6,$7,$8)',[s.id,s.requirements[0].id,'passed',0,'Dimensions inspected',id===work?built:null,null,id===work?{value:10,unit:'mm',samples:4,instrument:'Caliper 001',calibration:'Calibration 001',conditions:'Workshop bench',asset:'BUILD-001'}:null]);
 await db.query('select decide_engineering_review($1,$2,$3,$4)',[id,s.id,'approved','Independent inspection complete']);
}
await configure(release,'released_for_manufacturing');
await configure(work,'qc_accepted');
const released=await submit(release,'A');await approve(release,released);
await as(admin);
const job=(await first('select create_robot_build_job($1,$2,$3,$4,$5,$6,$7) id',[work,release,released.id,'Bracket','A','Use controlled drawing A',4])).id;
await as(student);
await db.query('select record_robot_build_progress($1,1,2,$2,$3)',[job,'Two brackets completed','10000000-0000-0000-0000-000000000001']);
await assert.rejects(db.query("update project_tasks set status='done' where id=$1",[work]),/quantities|review|inspection/i);
await db.query('select record_robot_build_progress($1,2,4,$2,$3)',[job,'Remaining brackets completed','10000000-0000-0000-0000-000000000002']);
const inspected=await submit(work,'A');
await assert.rejects(db.query('select record_robot_build_progress($1,3,3,$2,$3)',[job,'One needs correction','10000000-0000-0000-0000-000000000003']),/Reopen/);
await approve(work,inspected);
assert.equal((await first('select status from project_tasks where id=$1',[work])).status,'done');
await submit(release,'B');
await assert.rejects(db.query("update project_tasks set status='done' where id=$1",[work]),/release|review/i);
console.log('PASS actual engineering gates: release → manufacturing progress → independent QC → completion; changed release invalidates completion');
await db.close();
