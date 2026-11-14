# Robot Build: assembly to accepted work

Status: implementation in progress; not deployed. User authorized implementation, focused verification, production release and a new signed Android APK containing Hebrew scouting and current changes. This record does not claim completion or physical acceptance.

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

Pending. Record migration, source/release hashes, checks, production deployment and APK artifact here before marking complete.

## Implementation and focused acceptance (local)

- Additive work-package grouping uses the existing tasks, release gates, jobs, partial inspection lots and inventory ledger. Draft/save-and-assign, multiple students, inherited exact Onshape drawing, guarded start, one quantity-and-submit action, rework on the same CAD revision and reviewer physical-part identity are implemented.
- Student contributor permissions are restricted to grouped work. Historical participants cannot later approve their own work. Existing task/review APIs remain compatible; old tasks retain revision uniqueness.
- Existing task management remains the place for later assignment changes; this release does not add bulk package reassignment/cancellation. Existing assembly/installation and stock receiving remain separate from manufacturing approval.
- Local SQL tests passed: draft/assignment, retry/conflict, quantities, reviewer independence, owner/contributor/outsider behavior, release correction, premature-start denial, physical QC, partial/reworked lots, migration rerun, historical participant guard and legacy uniqueness. Existing complete manufacturing/stock/installation and lot suite passed.
- Hebrew fixture: draft saved without assigning; same draft assigned to owner + contributor; bought Kraken excluded; quantities 2 and 6 preserved; saved feedback and next drawing-approval link verified. Mobile390: package content335px, no package overflow. English entry verified. Fixture contains no real student data.
- TypeScript and Android frontend build/assets checks passed. Native signed build and production deployment in progress. No real-phone or workshop acceptance claim.
