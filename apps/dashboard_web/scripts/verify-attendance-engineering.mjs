import fs from "node:fs";import path from "node:path";const root=path.resolve(import.meta.dirname,"../../..");const read=file=>fs.readFileSync(path.join(root,file),"utf8");const attendance=read("apps/dashboard_web/src/pages/TeamHubPages.tsx"),edge=read("supabase/functions/attendance/index.ts"),wifi=read("apps/dashboard_web/android/app/src/main/java/com/g3/scouting/WifiInfoPlugin.java"),engineering=read("apps/dashboard_web/src/pages/EngineeringHubPage.tsx"),github=read("supabase/functions/github-repositories/index.ts"),checks=[
["active check-out survives expired meeting",attendance.includes("activeRecord")&&edge.includes('body.action === "check_out" && activeAttendance')],
["expired open meetings close automatically",edge.includes('status: "closed"')&&edge.includes('.lt("ends_at", nowIso)')],
["GPS and school Wi-Fi are explicit",attendance.includes('"location")')&&attendance.includes('"wifi")')&&attendance.includes("School Wi-Fi")],
["rejected GPS falls back to trusted Wi-Fi",attendance.includes("await verifyWifi(result.reason)")],
["Android requests Wi-Fi runtime permissions",wifi.includes("requestPermissionForAlias")&&wifi.includes("nearbyWifi")],
["engineering hub combines both G3 sources",github.includes('owner:"GlueGunAndGlitter"')&&github.includes('owner:"GlueGunGlitter"')],
["engineering catalog is authenticated and read-only",github.includes("caller.auth.getUser")&&!github.includes('method:"POST"')],
["engineering hub caches last successful catalog",engineering.includes("localStorage.setItem(cacheKey")&&engineering.includes("cacheRead()")],
["engineering hub organizes repositories by purpose",["software","cad","scouting","experiments","archive"].every(value=>engineering.includes(`"${value}"`))],
["legacy seasons classify as archive before software",github.indexOf('if(/archive|2023|2024|crescendo/')<github.indexOf('if(/robot|swerve|frc|java|wpilib/')],
["engineering route is lazy and work-linked",read("apps/dashboard_web/src/main.tsx").includes('lazy(()=>import("./pages/EngineeringHubPage"))')&&read("apps/dashboard_web/src/pages/FrcWorkPage.tsx").includes('navigate("/engineering")')],
["purchase reliability correction remains included",read("apps/dashboard_web/src/pages/ToolsInventoryPage.tsx").includes('min="0.01" step="0.01"')&&read("apps/dashboard_web/src/pages/ToolsInventoryPage.tsx").includes("isSubmittingPurchase")]
];let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} attendance + engineering checks`);
