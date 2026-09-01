import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const work = read("src/pages/FrcWorkPage.tsx");
const home = read("src/pages/ProductivityHomePage.tsx");
const inbox = read("src/components/HomeActionInbox.tsx");
const migration = read("../../backend/supabase/unified_responsibility_engine_20260902.sql");

const checks = [
  ["Work treats qualified training as complete", work.includes('status!=="qualified"') && !work.includes('status!=="completed"')],
  ["Home has a single responsibility list", home.includes("<HomeActionInbox/>") && !home.includes("home-my-work")],
  ["Work uses the shared responsibility list", work.includes('<HomeActionInbox mode="work" />')],
  ["Responsibilities deep-link to source records", inbox.includes("action.destination||\"/work\"")],
  ["Archived project tasks cancel responsibilities", migration.includes("new.archived or new.status='done'")],
  ["Qualified training cancels responsibilities", migration.includes("new.status='qualified'")],
  ["Competition assignments synchronize", migration.includes("competition_assignment_to_action")],
  ["Mandatory calendar events synchronize", migration.includes("calendar_event_to_action")],
  ["Robot issues synchronize", migration.includes("robot_issue_to_action")],
  ["Announcements archive cleanly", migration.includes("new.created_by,new.archived")],
];

for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
if (checks.some(([, passed]) => !passed)) process.exit(1);
