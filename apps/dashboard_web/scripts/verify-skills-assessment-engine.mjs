import fs from "node:fs";
import assert from "node:assert/strict";

const page=fs.readFileSync("src/pages/TrainingCenterPage.tsx","utf8");
const css=fs.readFileSync("src/teamHub.css","utf8");
const sql=fs.readFileSync("../../backend/supabase/skills_academy_quiz_engine_20260905.sql","utf8");

const checks=[
  [page.includes('value="single_choice"'),"single-answer quiz authoring"],
  [page.includes('value="multiple_choice"'),"multi-answer quiz authoring"],
  [page.includes('type={question.kind==="single_choice"?"radio":"checkbox"}'),"correct-answer control semantics"],
  [page.includes('structured?.kind==="multiple_choice"'),"student multi-select rendering"],
  [page.includes('correct_answers:_,...question'),"answer keys removed from public question JSON"],
  [page.includes('supabase.rpc("submit_training_quiz"'),"server-side quiz submission"],
  [sql.includes("create table if not exists public.training_assessment_answer_keys"),"private answer-key table"],
  [sql.includes("create or replace function public.submit_training_quiz"),"server-side grading function"],
  [sql.includes("answer=expected->0"),"single-answer grading semantics"],
  [sql.includes("q->>'kind'='multiple_choice' and expected is not null and answer=expected"),"multi-answer exact-match grading"],
  [sql.includes("training_submission_attempt_unique"),"multiple-attempt integrity"],
  [sql.includes("publish_training_assessment_assignments"),"assignment/action publication"],
  [css.includes(".student-quiz-options label:has(input:checked)"),"selected-answer visual state"],
  [css.includes("@media(max-width:780px)"),"mobile assessment layout"],
];

for(const [passed,label] of checks){assert.ok(passed,`Missing ${label}`);console.log(`✓ ${label}`);}
console.log("Skills Academy assessment engine verification passed.");
