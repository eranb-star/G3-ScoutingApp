import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createResearchFixture,researchAdmin,researchMember} from './robot-research-fixture.mjs';
import {extractPdf,extractHtml,textChunks} from '../../../backend/supabase/functions/knowledge-source-check/extraction.mjs';
import {getDocumentProxy} from 'unpdf';
process.on('uncaughtException',e=>{console.error(e.message,e.internalQuery??'');process.exit(1);});
const db=await createResearchFixture();
await db.exec('create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])');
for(const name of ['knowledge_corpus_20260921.sql','knowledge_document_ingestion_20260924.sql','knowledge_document_ingestion_20260924.sql'])await db.exec(fs.readFileSync(new URL('../../../backend/supabase/'+name,import.meta.url),'utf8'));
await db.exec("insert into frc_corpus_generations(id,status,expected_sources,expected_passages,expected_citations)values('test','active',0,0,0)");
const url='https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf';
const chunks=[{body:'Tower climb scores thirty points in this synthetic test only.',locator:{page:7}}];
async function job(){await db.exec(`reset role;set test.uid='${researchAdmin}';set test.allowed='yes'`);const run=(await db.query("insert into frc_knowledge_checks(season,started_by)values(2026,$1)returning id",[researchAdmin])).rows[0].id;const item=(await db.query("insert into frc_knowledge_check_items(check_id,url,title,kind)values($1,$2,'Manual','document')returning id",[run,url])).rows[0].id;await db.exec('set role service_role');const token=(await db.query('select lease_frc_source_check($1,$2) token',[run,researchAdmin])).rows[0].token;return{run,item,token};}
async function publish(j,hash='a',rows=chunks,error=null){return(await db.query('select finish_frc_document_ingestion($1,$2,$3,$4,100,null,null,$5,$6,$7) ok',[j.run,j.token,j.item,hash.repeat(64),JSON.stringify(rows),JSON.stringify({pages:1,extractor:'official-text-v1'}),error])).rows[0].ok;}
const first=await job();
const stage=async(expected,state,rows)=>(await db.query('select stage_frc_document_batch($1,$2,$3,$4,$5,$6) ok',[first.run,first.token,first.item,expected,JSON.stringify(state),JSON.stringify(rows)])).rows[0].ok;
assert.equal(await stage(0,{cursor:1,sha:'a'.repeat(64),bytes:100},[]),true);
assert.equal(await stage(1,{cursor:1,attempts:1},[]),true);
assert.equal(await stage(1,{cursor:9},chunks),true);
assert.equal(await stage(1,{cursor:17},chunks),false,'stale page batch rejected');
assert.equal((await db.query('select chunks from frc_document_text_staging')).rows[0].chunks.length,1);
assert.equal(await publish(first),true);assert.equal(await publish(first),false);
await db.query('select release_frc_source_check($1,$2)',[first.run,first.token]);
await db.exec(`set role authenticated;set test.uid='${researchMember}'`);
let search=(await db.query("select search_frc_corpus('climb') result")).rows[0].result;assert.equal(search.count,1);assert.match(search.rows[0].url,/#page=7$/);
assert.equal((await db.query("select jsonb_array_length(search_frc_official(2026,'climb')) n")).rows[0].n,1);
assert.equal((await db.query("select jsonb_array_length(search_frc_official(2025,'climb')) n")).rows[0].n,0);
await assert.rejects(()=>publish(first),/permission/);
await db.exec("set test.allowed='no'");await assert.rejects(()=>db.query("select search_frc_official(2026,'climb')"),/access/);
const second=await job();assert.equal(await publish(second,'b',[], 'Scan needs OCR'),true);await db.query('select release_frc_source_check($1,$2)',[second.run,second.token]);
await db.exec(`set role authenticated;set test.allowed='yes';set test.uid='${researchMember}'`);
assert.equal((await db.query("select search_frc_corpus('climb') result")).rows[0].result.count,0,'failed changed revision must retire obsolete text');
const third=await job();assert.equal(await publish(third,'b'),true);await db.query('select release_frc_source_check($1,$2)',[third.run,third.token]);
const fourth=await job();assert.equal(await publish(fourth,'b'),true);await db.query('select release_frc_source_check($1,$2)',[fourth.run,fourth.token]);
await db.exec('reset role');assert.equal((await db.query('select count(*) n from frc_corpus_citations')).rows[0].n,2,'retries must not duplicate passages/citations');
await db.query("select activate_frc_corpus('test')");
const cancelled=await job();await db.exec('set role authenticated');await db.query('select cancel_frc_source_check($1)',[cancelled.run]);await db.exec('set role service_role');assert.equal(await publish(cancelled,'c'),false);
await db.close();
assert.ok(textChunks('word '.repeat(1500),{page:1}).every(c=>c.body.length<=2800));
const html=extractHtml(new TextEncoder().encode('<html><h1 id="rules">Rules</h1><p>'+('climbing rules '.repeat(30))+'</p><h2>Updates</h2><p>'+('updated rules '.repeat(30))+'</p></html>'));assert.equal(html.chunks[0].locator.anchor,'rules');
await assert.rejects(()=>extractPdf(new Uint8Array([1,2,3]),getDocumentProxy));
if(process.argv.includes('--live-file')){
 const result=await extractPdf(new Uint8Array(fs.readFileSync('../../docs/staging/ingest-manual.local.pdf')),getDocumentProxy);
 assert.ok(result.pages>100);assert.ok(result.chunks.some(c=>/TRAVERSAL/.test(c.body)));assert.ok(result.chunks.every(c=>c.locator.page<=result.pages));
 const batch=await extractPdf(new Uint8Array(fs.readFileSync('../../docs/staging/ingest-manual.local.pdf')),getDocumentProxy,{startPage:41,pageCount:8});assert.equal(batch.nextPage,49);assert.ok(batch.chunks.every(c=>c.locator.page>=41&&c.locator.page<=48));
 console.log(`Real FIRST manual: ${result.pages} pages; ${result.chunks.length} page-linked passages.`);
}
console.log('PASS: repeatable migration, atomic publication, permissions, season isolation, retirement on extraction failure, retry deduplication, cancellation, generation reconciliation, locators and extraction bounds.');
