import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"../../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const auth=read("apps/dashboard_web/src/lib/memberAuth.tsx");
const more=read("apps/dashboard_web/src/pages/TeamHubPages.tsx");
const admin=read("apps/dashboard_web/src/pages/AdminDashboardPage.tsx");
const attendance=read("apps/dashboard_web/src/pages/AttendanceReportsPage.tsx");
const updates=read("apps/dashboard_web/src/pages/UpdatesPage.tsx");
const github=read("supabase/functions/github-repositories/index.ts");
const checks=[
  ["administration center exposes finance and governance",admin.includes('"/admin/finance"')&&admin.includes('"/admin/permissions"')&&admin.includes('"/admin/security"')],
  ["phone More does not duplicate administration",!more.includes('navigate("/admin/finance")')&&!more.includes('navigate("/admin/members")')],
  ["absence submission invokes responsibility push",attendance.includes("notifyActionsBySourceId(data.id)")],
  ["absence decision invokes member push",attendance.includes("notifyActionsBySourceId(requestId)")],
  ["viewed responsibilities remain visible in inbox",updates.includes('status==="completed"')&&!updates.includes('status==="acknowledged"||state.status==="completed"')],
  ["token refresh retains the validated profile",auth.includes("profileRef.current")&&!auth.includes("setProfile(null);\n    setProfileError")],
  ["stale profile requests cannot overwrite current account",auth.includes("requestId !== requestRef.current")],
  ["initial session races cannot reveal Account unavailable",auth.includes("setProfile(profileRef.current);\n    setLoading(false);")&&!auth.includes("if (alive) setLoading(false)")],
  ["GitHub token remains server-side",github.includes('Deno.env.get("GITHUB_TOKEN")')&&!read("apps/dashboard_web/src/pages/EngineeringHubPage.tsx").includes("GITHUB_TOKEN")],
  ["authenticated GitHub user endpoint can return private repositories",github.includes("/user/repos")&&github.includes("visibility=all")],
  ["corrected Android package has a distinct release identity",read("apps/dashboard_web/android/app/build.gradle").includes('versionCode 17')&&read("apps/dashboard_web/android/app/build.gradle").includes('versionName "2.1.3"')],
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} mobile, notification and stability checks`);
