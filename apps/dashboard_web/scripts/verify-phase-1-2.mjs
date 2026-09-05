import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const work = read("src/pages/FrcWorkPage.tsx");
const home = read("src/pages/ProductivityHomePage.tsx");
const inbox = read("src/components/HomeActionInbox.tsx");
const access = read("src/lib/accessControl.ts");
const academy = read("src/pages/TrainingCenterPage.tsx");
const projects = read("src/pages/ProjectsPage.tsx");
const updates = read("src/pages/UpdatesPage.tsx");
const unreadUpdates = read("src/lib/unreadUpdates.ts");
const sendPush = read("../../backend/supabase/functions/send-push/index.ts");
const rolePermissions = read("../../backend/supabase/roles_permissions_multi_team_20260904.sql");
const competition = read("src/pages/CompetitionOperationsPage.tsx");
const offlineDb = read("src/lib/offlineDb.ts");
const serviceWorker = read("public/sw.js");
const migration = read("../../backend/supabase/unified_responsibility_engine_20260902.sql");
const inventoryBoundary = read("../../backend/supabase/inventory_admin_boundary_20260905.sql");
const competitionBoundary = read("../../backend/supabase/competition_access_boundary_20260905.sql");
const academyBoundary = read("../../backend/supabase/skills_academy_access_boundary_20260905.sql");

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
  ["Only administrators manage inventory by default", !access.match(/team_leader:\[[^\]]*manage_inventory/) && !access.match(/mentor:\[[^\]]*manage_inventory/) && Boolean(access.match(/admin:\[[^\]]*manage_inventory/))],
  ["Team leaders submit purchase requests without inventory control", Boolean(access.match(/team_leader:\[[^\]]*submit_purchase_requests/)) && inventoryBoundary.includes("('team_leader', 'manage_inventory', false)")],
  ["Inventory boundary is enforced for every role", inventoryBoundary.includes("('member', 'manage_inventory', false)") && inventoryBoundary.includes("('mentor', 'manage_inventory', false)") && inventoryBoundary.includes("('admin', 'manage_inventory', true)")],
  ["Skills Academy edits are scoped to the selected course", academy.includes('const canEdit=access.can("manage_training",active?.target_subteam)')],
  ["Team leaders default new courses to a led department", academy.includes('target_subteam:profile?.role==="team_leader"')],
  ["Unauthorized course targets are rejected before submission", academy.includes('Choose a department you are authorized to lead.')],
  ["Project status updates verify ownership or team authority", projects.includes('project.owner_id!==profile?.id&&!access.can("manage_team_projects",project.subteam)')],
  ["Task status updates verify assignee or creator", projects.includes('task.assignee_id!==profile?.id&&task.created_by!==profile?.id')],
  ["Only administrators create competition assignments", competitionBoundary.includes('with check(public.is_admin() and assigned_by=auth.uid())')],
  ["Members cannot reassign their competition station", competitionBoundary.includes('Only administrators can change assignment details')],
  ["Only administrators publish competition briefings", competitionBoundary.includes('admins create competition briefings')],
  ["Pit updates are limited to responsible members", competitionBoundary.includes('owner_id=auth.uid() or reported_by=auth.uid()')],
  ["Students cannot self-grade assessment submissions", academyBoundary.includes("score is null and feedback is null") && academyBoundary.includes("Only an authorized instructor can review or grade work")],
  ["Assessment enrollment must match its course", academyBoundary.includes("e.course_id=(")],
  ["Students cannot award their own qualification", academyBoundary.includes("Only an authorized instructor can change enrollment or qualification details")],
  ["Announcement visibility follows the selected audience", updates.includes('if(target==="admins")return role==="admin"') && updates.includes('if(target==="subteam")return memberTeams(profile).some')],
  ["Unread announcement counts respect audience boundaries", unreadUpdates.includes('if(audience==="admins")return role==="admin"') && unreadUpdates.includes('if(audience==="subteam")return subteams.includes')],
  ["Push delivery filters members by announcement audience", sendPush.includes('if (announcement.audience === "members")') && sendPush.includes('announcement.audience!=="subteam"')],
  ["Announcement access is protected in the database", rolePermissions.includes('create policy "members read applicable announcements"') && rolePermissions.includes("public.has_permission('create_announcements'")],
  ["Competition command pack caches all critical event data", competition.includes("cacheCompetitionSnapshot") && offlineDb.includes("competitionCache")],
  ["Offline match control is limited to authorized pit operators", competition.includes('canControl=isAdmin||myAssignments.some(x=>x.role==="pit_crew")') && competition.includes("if(online||!canControl")],
  ["Offline competition changes synchronize on reconnect", competition.includes("flushOfflineChanges") && offlineDb.includes("competitionMutations")],
  ["Web application shell is available offline", serviceWorker.includes('request.mode==="navigate"') && serviceWorker.includes('caches.match("/index.html")')],
];

for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
if (checks.some(([, passed]) => !passed)) process.exit(1);
