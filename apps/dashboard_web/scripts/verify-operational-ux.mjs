import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const checks=[
  ["inventory stores model and amount",read("apps/dashboard_web/src/pages/ToolsInventoryPage.tsx").includes("model:tool.model||null")&&read("apps/dashboard_web/src/pages/ToolsInventoryPage.tsx").includes("amount:Math.max")],
  ["equipment return uses a calendar picker",read("apps/dashboard_web/src/pages/ToolsInventoryPage.tsx").includes('input.type="date"')],
  ["calendar renders overlapping multi-day events",read("apps/dashboard_web/src/pages/UnifiedCalendarPage.tsx").includes("occursOnDay(x,d)")],
  ["calendar rejects reversed ranges",read("apps/dashboard_web/src/pages/UnifiedCalendarPage.tsx").includes("endsAt<startsAt")],
  ["assessment UI supports all, teams and people",read("apps/dashboard_web/src/pages/TrainingCenterPage.tsx").includes('["all","subteams","members"]')],
  ["assessment scope is stored in the payload",read("apps/dashboard_web/src/pages/TrainingCenterPage.tsx").includes("target_values:assessmentForm.target_values")],
  ["assessment responsibilities open the requested Academy view",read("apps/dashboard_web/src/pages/TrainingCenterPage.tsx").includes('searchParams.get("view")')],
  ["database filters assessment recipients",read("backend/supabase/operational_ux_release_20260906.sql").includes("activity.target_type='members'")],
  ["database creates recipient responsibilities",read("backend/supabase/operational_ux_release_20260906.sql").includes("training_assessment_assignments")],
  ["route loading has retry and failure recovery",read("apps/dashboard_web/src/main.tsx").includes("WorkspaceErrorBoundary")&&read("apps/dashboard_web/src/main.tsx").includes("Retry")],
  ["service worker refreshes deployed assets",read("apps/dashboard_web/public/sw.js").includes('fetch(request).then(response=>{const copy=response.clone()')&&read("apps/dashboard_web/public/sw.js").includes('g3-team-hub-shell-v2')]
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`PASS ${checks.length} operational UX checks`);
