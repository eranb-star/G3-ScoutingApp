import assert from 'node:assert/strict';
import {titleCandidates} from './source-title-candidates.mjs';
assert.deepEqual(titleCandidates('FRC 2018 — 2023 build thread'), {years:[2023],teams:[2018]});
assert.deepEqual(titleCandidates('1986 Robot Reveal for 2017'), {years:[2017],teams:[1986]});
assert.deepEqual(titleCandidates('Team 1 — 2022 robot 3D CAD v2.0'), {years:[2022],teams:[1]});
assert.deepEqual(titleCandidates('2025 robot showcase'), {years:[2025],teams:[]});
assert.deepEqual(titleCandidates('FRC 254 2024 / 2025 designs'), {years:[2024,2025],teams:[254]});
console.log('Source title discovery edge cases passed; no factual attribution inferred.');
