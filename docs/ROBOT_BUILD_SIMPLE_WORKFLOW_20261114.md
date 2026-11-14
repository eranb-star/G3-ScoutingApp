# Robot Build: assembly to accepted work

Status: implemented, deployed and production-smoke verified. Signed APK2.8.0/code32 built and verified. Physical phone installation and student/workshop acceptance remain untested.

## User experience contract

- Leader: add/import an assembly, save it, select the work and students, then review the submitted result. One work package groups selected parts; no mandatory separate task creation for every part.
- Student: My work shows the assigned package, instructions, quantities, drawing/revision, teammates, deadline and reviewer. Start, report a problem, and submit ready pieces are the main actions. Advanced engineering settings stay out of this path.
- Reviewer: inspect the exact submitted revision and quantities; approve or return with a reason. Partial acceptance must retain accepted pieces and show the remaining quantity.
- Manufacture, assembly, physical testing and installation remain distinct. Manufacturing approval must never imply that the robot was assembled or physically tested.

## Implementation boundaries

Reuse project tasks, manufacturing preparations/jobs, engineering review gates, inspection lots, BOM requirements and assembly membership. Add grouping and participation rather than creating a second manufacturing/stock ledger. Default one package per selected assembly; optional part selection/splitting. Source revision is inherited and pinned. New CAD revisions require deliberate review; repeated import retains existing idempotency.

Save and assign must be atomic and retry-safe. Saving a draft does not publish an assignment. Work may be assigned before manufacturing prerequisites are approved, but starting remains guarded. Display the blocking reason and the responsible next action. Purchased/reused/excluded parts must not become manufacturing jobs automatically.

Multiple students require server-side authorization, personal queue visibility and reviewer independence for all participants, including partial lots. Do not implement decorative participant lists. Existing single-owner tasks and old APK calls remain compatible. No silent migration of historical work or stock/finance records.

## Reliability and verification

Preserve exact source identities, cumulative quantities, optimistic version checks, request IDs and draft recovery. Failed/offline saves must not claim success. Existing outputs survive cancellation/reassignment. Reviewers cannot approve their own work. Access must fail closed for inactive/unauthorized users and closed projects.

Focused checks: new package creation and retry, conflicting retry, mixed part quantities, participant/outsider permissions, reviewer conflicts, missing prerequisites, cumulative progress conflicts, partial acceptance/rework, existing work compatibility; Hebrew/English desktop/mobile navigation and draft recovery; TypeScript and required CI. Verify production entry points after deployment. Build and verify signed APK, version/code, size and checksum. Report real-device/student/workshop acceptance separately.

## Release evidence

Source **cb74fa2**, release **d582706**, CI **426/427 passed**. Production **55DgPLEaFqXt5Mv7kpX3H5RWgGh1**, Ready **21:56:38 Israel, 14 November 2026**, g3-6740.com; user completed Vercel verification. Preview2BjjhSLMi39yKK4FspqXqWdMZccs preceded production.

Migration robot_build_work_packages_20261114.sql applied with an atomic before/after full-row digest assertion. Existing27 project tasks,10 projects,1 BOM and2 BOMlines unchanged; existing preparations/jobs/lots/review gates/submissions were empty and remained empty. Review build_attempt is the additive metadata excluded from the historical digest. RLS enabled for every new table. A production transaction rehearsed assignment using QA profiles plus exact retry, validated preparation creation, then rolled back all test data. No real student assignments or manufacturing records created.

Live Hebrew Robot Build entry, single package section, assignment form and existing BOM listing verified; Onshape navigation retains the selected project and loads source list. Local mobile/English coverage below. Production screenshot: docs/staging/build-workflow-production-20261114.png.

APK **releases/G3-Team-Hub-2.8.0.apk**, **18,524,154bytes (18.52MB)**, package com.g3.scouting, versionCode32, minAPI24/targetAPI36. SHA256 **2b5cf2012a914be9346a59274489f0d24725606a462b834415a1fd845bb584ef**. Same signing certificate45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580. Java21 assembleRelease/lintRelease passed; 115 packaged frontend files match generated assets byte-for-byte; Hebrew scouting and grouped-work UI present. Existing bundled current field/KitBot and optional asset policy retained. Native automatic-checkout observation policy unchanged. Install over the existing APK without uninstalling. No physical Android device acceptance or notification receipt is claimed.

Rollback: redeploy prior production a59e46f if required. Keep additive tables/history; do not reverse the migration destructively after real assignments. Prior clients remain supported. Source status documentation is committed locally after release to avoid redundant CI/deployment.

## Implementation and focused acceptance (local)

- Additive work-package grouping uses the existing tasks, release gates, jobs, partial inspection lots and inventory ledger. Draft/save-and-assign, multiple students, inherited exact Onshape drawing, guarded start, one quantity-and-submit action, rework on the same CAD revision and reviewer physical-part identity are implemented.
- Student contributor permissions are restricted to grouped work. Historical participants cannot later approve their own work. Existing task/review APIs remain compatible; old tasks retain revision uniqueness.
- Existing task management remains the place for later assignment changes; this release does not add bulk package reassignment/cancellation. Existing assembly/installation and stock receiving remain separate from manufacturing approval.
- Local SQL tests passed: draft/assignment, retry/conflict, quantities, reviewer independence, owner/contributor/outsider behavior, release correction, premature-start denial, physical QC, partial/reworked lots, migration rerun, historical participant guard and legacy uniqueness. Existing complete manufacturing/stock/installation and lot suite passed.
- Hebrew fixture: draft saved without assigning; same draft assigned to owner + contributor; bought Kraken excluded; quantities 2 and 6 preserved; saved feedback and next drawing-approval link verified. Mobile390: package content335px, no package overflow. English entry verified. Fixture contains no real student data.
- TypeScript and Android frontend build/assets checks passed. Native signed build and production deployment completed as recorded above. No real-phone or workshop acceptance claim.
