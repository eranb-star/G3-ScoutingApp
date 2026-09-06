import fs from "node:fs";
import assert from "node:assert/strict";

const page=fs.readFileSync("src/pages/TrainingCenterPage.tsx","utf8");
const component=fs.readFileSync("src/components/SkillsGradebook.tsx","utf8");
const css=fs.readFileSync("src/teamHub.css","utf8");
const sql=fs.readFileSync("../../backend/supabase/skills_academy_gradebook_20260906.sql","utf8");
const checks=[
  [page.includes('academyView==="progress"'),"gradebook navigation"],
  [component.includes('"not_started"')&&component.includes('"changes_requested"')&&component.includes('"overdue"'),"complete progress states"],
  [component.includes("Assessment history")&&component.includes("attempt.answers"),"attempt answer drill-down"],
  [component.includes("Export CSV"),"authorized gradebook export"],
  [component.includes("row.enrollment.member_id===profileId"),"student-facing record filter"],
  [sql.includes('member_id=auth.uid()')&&sql.includes('members view relevant training evidence'),"learner-record privacy policies"],
  [sql.includes("refresh_training_qualification"),"outcome-based qualification"],
  [sql.includes("not a.graded or a.passing_score is null or s.score>=a.passing_score"),"assessment pass rule"],
  [sql.includes("drop trigger if exists evidence_qualifies_enrollment"),"legacy qualification regression removed"],
  [css.includes(".gradebook-row-main")&&css.includes("@media(max-width:560px)"),"responsive gradebook layout"],
];
for(const [passed,label] of checks){assert.ok(passed,`Missing ${label}`);console.log(`✓ ${label}`);}
console.log("Skills Academy gradebook verification passed.");
