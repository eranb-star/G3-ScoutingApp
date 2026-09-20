// Contract checks against the local review server; no publisher or Supabase calls.
import assert from 'node:assert/strict';
const origin = process.env.REVIEW_ORIGIN || 'http://127.0.0.1:4225';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const get = async (path) => {
  const response = await fetch(origin + '/__collection' + path);
  assert.equal(response.status, 200);
  return response.json();
};
const status = await get('/status');
assert.equal(status.seasons.length, 10);
assert.equal(status.selected, status.seasons.reduce((sum, s) => sum + s.selected, 0));
for (const s of status.seasons) assert.ok(s.collected <= s.candidates);
const findings = [];
for (const term of ['PID', 'elevator', 'turret', 'drivetrain', 'gripper']) {
  const result = await get('/search?q=' + term);
  assert.ok(result.count > 0, term + ' should retrieve real source text');
  assert.ok(result.rows.every(r => r.body && /^https:\/\//.test(r.url)));
  findings.push({term, citations: result.count});
}
const first = await get('/search?q=PID&page=0');
const second = await get('/search?q=PID&page=1');
assert.ok(first.rows.every(a => second.rows.every(b => a.id !== b.id)), 'Pagination must not repeat citations');
assert.equal(first.count, second.count);
const filtered = await get('/search?q=PID&season=2017');
assert.ok(filtered.count > 0 && filtered.rows.every(r => r.seasons.includes(2017)));
const multiSeason = await get('/search?q=PID&years=2017,2018');
assert.ok(multiSeason.count >= filtered.count && multiSeason.rows.every(r => r.seasons.some(y => [2017,2018].includes(y))), 'Shared multi-season filters must search the union of selected years');
assert.equal((await get('/search?q=PID&years=2017')).count, filtered.count, 'Legacy and integrated season filters must agree');
assert.equal((await get('/search?q=PID&years=2027')).count, 0, 'A valid future season must not fall back to all years');
assert.equal((await fetch(origin + '/__collection/search?years=2017,invalid')).status, 400);
const absent = await get('/search?q=zzzznonexistentg3termxyz');
assert.equal(absent.count, 0);
const official = await get('/search?q=PID&source=official');
assert.ok(official.count>0&&official.rows.every(r=>r.source_class==='official'));
const team = await get('/search?q=PID&source=team');
assert.ok(team.count>0&&team.rows.every(r=>r.source_class==='team'));
assert.equal((await fetch(origin+'/__collection/search?source=invalid')).status,400);
const punctuation = await get('/search?q=' + encodeURIComponent("'; drop table passages; --"));
assert.ok(Array.isArray(punctuation.rows));
assert.equal((await get('/search?q=PID')).count, first.count, 'Search input must not change the database');
assert.equal((await fetch(origin + '/__collection/search?season=2017.5')).status, 400);
assert.equal((await fetch(origin + '/__collection/status', {method: 'POST'})).status, 405);
assert.equal((await fetch(origin + '/__collection/missing')).status, 404);
const topics = await get('/topics');
const gripper = topics.find(t => t.name === 'Gripper');
const elevator = topics.find(t => t.name === 'Elevator');
assert.ok(gripper && elevator);
const ids = encodeURIComponent([gripper.id, elevator.id].join(','));
const any = await get('/search?topics=' + ids + '&match=any');
const all = await get('/search?topics=' + ids + '&match=all');
assert.ok(all.count > 0 && all.count <= any.count, 'All topics must narrow passage results');
const synonym = await get('/search?q=claw&topics=' + encodeURIComponent(gripper.id));
assert.ok(synonym.count > 0, 'Gripper filter must include the existing claw synonym');
assert.equal((await fetch(origin + '/__collection/search?topics=missing-topic')).status, 400);
// New admin topics must search already indexed text without reimport or an LLM.
const topicArgs = {p_id:null,p_expected:0,p_name:'Local QA topic '+Date.now(),p_name_he:'',p_kind:'subject',p_synonyms:['PID'],p_description:'Temporary isolated fixture acceptance topic',p_active:true};
const saveTopic = async args => {
  const response = await fetch(origin + '/__research', {method:'POST',body:JSON.stringify({name:'save_frc_research_topic',args})});
  const body = await response.json();
  assert.equal(body.error, null);
  return body.data;
};
const newId = await saveTopic(topicArgs);
try {
  assert.ok((await get('/topics')).some(t => t.id === newId));
  assert.ok((await get('/search?topics=' + encodeURIComponent(newId))).count > 0);
} finally { await saveTopic({...topicArgs,p_id:newId,p_expected:1,p_active:false}); }
assert.ok(!(await get('/topics')).some(t => t.id === newId));
console.log(JSON.stringify({passed: true, indexedAt: first.indexedAt, sourceVersions: first.sourceCount, findings}));
