import fs from "node:fs";

const page=fs.readFileSync(new URL("../src/pages/TrainingCenterPage.tsx",import.meta.url),"utf8");
const component=fs.readFileSync(new URL("../src/components/SkillsResourceCatalog.tsx",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/teamHub.css",import.meta.url),"utf8");
const sql=fs.readFileSync(new URL("../../../backend/supabase/skills_academy_resource_catalog_20260906.sql",import.meta.url),"utf8");
const checks=[
  ["catalog navigation",page.includes('academyView==="catalog"')&&page.includes("SkillsResourceCatalog")],
  ["course resource shelf",page.includes("CourseResourceShelf")&&component.includes("training_course_resources")],
  ["search and filters",component.includes('type="search"')&&component.includes("All domains")&&component.includes("All levels")],
  ["admin governance",component.includes("Only approved resources are visible")&&component.includes("Review status")&&component.includes("Retire")],
  ["course attachment workflow",component.includes("Add to course")&&component.includes("Resource added to course")],
  ["student-safe resource policy",sql.includes("status='approved' or public.is_admin()")],
  ["admin-only catalog mutation",sql.includes('policy "admins create training resources"')&&sql.includes('policy "admins update training resources"')],
  ["team-scoped attachments",sql.includes("public.has_permission('manage_training',c.target_subteam)")],
  ["reviewed seed catalog",sql.includes("FRCDesign Learning Course")&&sql.includes("WPILib Zero to Robot")&&sql.includes("FIRST Team Safety")&&sql.includes("Spectrum 3847 Student Training")],
  ["responsive catalog",css.includes(".resource-catalog-hero")&&css.includes(".course-resource-shelf")&&css.includes("@media(max-width:620px)")]
];
for(const [name,pass] of checks){if(!pass){console.error(`FAIL ${name}`);process.exitCode=1;}else console.log(`PASS ${name}`)}
if(process.exitCode)process.exit(process.exitCode);
console.log("Skills Academy resource catalog verification passed.");
