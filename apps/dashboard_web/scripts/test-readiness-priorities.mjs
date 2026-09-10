import assert from 'node:assert/strict';import{eventContext,mergeReadinessPriorities}from'../src/lib/readiness.ts';
const pick=en=>en,event={title:'Off-Season',days_until:12};
assert.equal(eventContext(event,pick),'12 days until Off-Season');assert.equal(eventContext({...event,days_until:0},pick),'Off-Season starts today');assert.equal(eventContext({...event,days_until:-1},pick),'Off-Season · Day 2');
const task={id:'task',title:'Normal task',details:null,priority:'normal',due_at:null,created_at:'2026-01-01',action_type:'assignment'},issue={...task,id:'action',title:'Issue',source_table:'robot_issues',source_id:'issue'};
const risk={id:'risk',signal_type:'CRITICAL_ROBOT_ISSUE',source_id:'issue',assigned_user_id:'me',title:'Issue',summary:'Critical',opened_at:'2026-01-01',href:'/robot-issues?issue=issue',severity:'critical'};
const merged=mergeReadinessPriorities([task,issue],[task,issue],[risk],'me');assert.equal(merged.length,2);assert.equal(merged[0].id,'action');
assert.equal(mergeReadinessPriorities([task,issue],[task],[risk],'me')[0].id,'action'); // Inbox completion cannot resolve critical source condition.
assert.equal(mergeReadinessPriorities([task],[task],[risk],'me')[0].source_id,'issue');
assert.equal(mergeReadinessPriorities([task],[task],[risk],'other').length,1);
assert.equal(mergeReadinessPriorities([task],[task],[],'me').length,1);
assert.equal(merged[0].priority,'normal'); // Do not modify stored/source action.
console.log('PASS context wording and priorities: single source item, critical first, hidden-action restoration, ownership and nonmutation');
