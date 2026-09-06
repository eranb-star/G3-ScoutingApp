import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const sql=read("backend/supabase/skills_academy_learning_automation_20260906.sql");
const training=read("apps/dashboard_web/src/pages/TrainingCenterPage.tsx");
const gradebook=read("apps/dashboard_web/src/components/SkillsGradebook.tsx");
const main=read("apps/dashboard_web/src/main.tsx");
const checks=[
  ["immutable progression history",sql.includes("training_progress_events")&&sql.includes("training_submission_progress_history")],
  ["duplicate-safe history",sql.includes("training_progress_event_submission_unique")&&sql.includes("on conflict")],
  ["due-soon and overdue refresh",sql.includes("refresh_my_training_reminders")&&sql.includes("Due soon")&&sql.includes("Overdue")],
  ["changes-requested action",sql.includes("Changes requested")&&sql.includes("Retry available")],
  ["student-owned reminder refresh",sql.includes("assignment.member_id=auth.uid()")],
  ["history RLS",sql.includes('members view relevant training progress events')&&sql.includes("member_id=auth.uid()")],
  ["client refreshes reminders",training.includes('rpc("refresh_my_training_reminders")')],
  ["support queue",gradebook.includes("Members who may be blocked")&&gradebook.includes("Attempts exhausted")],
  ["progress timeline",gradebook.includes("Progress timeline")&&gradebook.includes("progressEvents.filter")],
  ["heavy routes are lazy",main.includes('lazy(()=>import("./pages/TrainingCenterPage"))')&&main.includes("<Suspense")]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
if(failed.length)process.exit(1);

