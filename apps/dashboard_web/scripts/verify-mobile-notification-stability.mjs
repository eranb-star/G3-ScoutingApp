import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const auth=read("apps/dashboard_web/src/lib/memberAuth.tsx");
const more=read("apps/dashboard_web/src/pages/TeamHubPages.tsx");
const attendance=read("apps/dashboard_web/src/pages/AttendanceReportsPage.tsx");
const updates=read("apps/dashboard_web/src/pages/UpdatesPage.tsx");
const github=read("supabase/functions/github-repositories/index.ts");
const checks=[
  ["phone More exposes admin-only finance",more.includes('navigate("/admin/finance")')&&more.includes("Finance & reimbursements")],
  ["absence submission invokes responsibility push",attendance.includes("notifyActionsBySourceId(data.id)")],
  ["absence decision invokes member push",attendance.includes("notifyActionsBySourceId(requestId)")],
  ["viewed responsibilities remain visible in inbox",updates.includes('status==="completed"')&&!updates.includes('status==="acknowledged"||state.status==="completed"')],
  ["token refresh retains the validated profile",auth.includes("profileRef.current")&&!auth.includes("setProfile(null);\n    setProfileError")],
  ["stale profile requests cannot overwrite current account",auth.includes("requestId !== requestRef.current")],
  ["GitHub token remains server-side",github.includes('Deno.env.get("GITHUB_TOKEN")')&&!read("apps/dashboard_web/src/pages/EngineeringHubPage.tsx").includes("GITHUB_TOKEN")],
  ["authenticated GitHub user endpoint can return private repositories",github.includes("/user/repos")&&github.includes("visibility=all")],
  ["Android release is versioned once for combined batch",read("apps/dashboard_web/android/app/build.gradle").includes('versionCode 14')&&read("apps/dashboard_web/android/app/build.gradle").includes('versionName "2.1.0"')],
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} mobile, notification and stability checks`);
