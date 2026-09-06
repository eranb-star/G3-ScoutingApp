import fs from"node:fs";import path from"node:path";
const root=path.resolve(import.meta.dirname,"../../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const main=read("apps/dashboard_web/src/main.tsx"),media=read("apps/dashboard_web/src/pages/TeamMediaPage.tsx"),feedback=read("apps/dashboard_web/src/pages/FeedbackCenterPage.tsx"),sql=read("backend/supabase/team_media_feedback_center_20260906.sql"),css=read("apps/dashboard_web/src/mediaFeedback.css");
const checks=[
 ["media and feedback routes are member-gated",main.includes('path="/media" element={<MemberGate>')&&main.includes('path="/feedback" element={<MemberGate>')],
 ["team media has five purposeful collections",["robot","cad","workshop","event","team"].every(value=>media.includes(`["${value}"`))],
 ["images are compressed before upload",media.includes("prepareImage(file)")],
 ["media storage is private and size-limited",sql.includes("'team-media','team-media',false,15728640")],
 ["media deletion is owner or leadership scoped",sql.includes('"owners and leaders delete team media"')],
 ["feedback supports ideas, bugs and screenshots",feedback.includes('report_type:"idea"')&&feedback.includes('feedback-attachments')],
 ["students only see their own feedback while leaders triage",sql.includes("submitted_by=auth.uid() or public.current_team_role() in ('admin','mentor')")],
 ["feedback status returns through team responsibilities",sql.includes("sync_team_action('feedback_reports'")],
 ["feedback comments share the report privacy boundary",sql.includes('"participants view feedback comments"')],
 ["phone layouts collapse without narrow columns",css.includes("@media(max-width:620px)")&&css.includes(".media-gallery{grid-template-columns:1fr}")&&css.includes(".feedback-triage{grid-template-columns:1fr}")],
 ["native calendar input is used for media dates",media.includes('type="date"')],
 ["Hebrew labels are included in both modules",media.includes("מדיה קבוצתית")&&feedback.includes("מרכז משוב")]
];let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} Team Media + Feedback checks`);
