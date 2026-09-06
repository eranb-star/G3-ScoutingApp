import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8"),page=read("src/pages/AttendanceReportsPage.tsx"),home=read("src/pages/ProductivityHomePage.tsx"),inbox=read("src/components/HomeActionInbox.tsx"),visibility=read("src/lib/responsibilityVisibility.ts"),sql=read("../../backend/supabase/absence_attendance_governance_20260907.sql"),css=read("src/teamHub.css");
const checks=[
 ["home and work share responsibility visibility",home.includes("visibleResponsibilities")&&inbox.includes("visibleResponsibilities")&&visibility.includes('mode:"home"|"work"')],
 ["absence requests require calendar event and reason",sql.includes("calendar_event_id uuid not null")&&sql.includes("length(trim(reason))>=3")],
 ["absence review requires written response",sql.includes("A decision and written response are required")&&page.includes("Response to member (required)")],
 ["admins and mentors receive review actions",sql.includes("role in ('admin','mentor')")&&sql.includes("absence_review_")],
 ["member receives decision action",sql.includes("'absence_request_status'")&&sql.includes("request.member_id::text")],
 ["manual roster is permission checked and audited",sql.includes("save_meeting_attendance_roster")&&sql.includes("roster_present")&&sql.includes("roster_absent")],
 ["attendance center separates overview absences and roster",page.includes('"overview"|"absences"|"roster"')&&page.includes("attendance-tabs")],
 ["phone roster uses one readable column",css.includes(".roster-grid{grid-template-columns:1fr}")],
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} absence + attendance checks`);
