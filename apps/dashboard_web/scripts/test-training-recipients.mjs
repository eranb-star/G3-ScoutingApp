import assert from 'node:assert/strict';
import {selectTrainingRecipients} from '../src/lib/trainingRecipients.ts';
const people=[{id:'student',role:'member'},{id:'leader',role:'team_leader'},{id:'mentor',role:'mentor'},{id:'admin',role:'admin'},{id:'outside',role:'member'}];
assert.deepEqual(selectTrainingRecipients(people,undefined,false),['student','outside']);
assert.deepEqual(selectTrainingRecipients(people,undefined,true),['student','leader','outside']);
assert.deepEqual(selectTrainingRecipients(people,['student','leader','mentor'],true),['student','leader']);
assert.deepEqual(selectTrainingRecipients(people,[],true),[]);
assert.deepEqual(selectTrainingRecipients(people,['leader'],false),[]);
console.log('PASS: member selection, optional leaders, assignment scope, empty scope and excluded roles.');
