# Robot Build phase 1 — implementation contract (10 October 2026)

Status: IN DEVELOPMENT. This record supersedes earlier UX proposals for phase 1 only. Production remains the prior Robot Build implementation until an explicit release record below.

## Scope and boundaries
Four destinations: Build dashboard, Assemblies & parts, Workshop, Assembly & testing. Contextual CAD, existing inventory/purchasing/tasks/review workflows. Preserve existing approvals, audit history, stock conservation and role permissions. No placement editor, weight calculation, simulation synchronization, paid services, robot repository writes or APK work.

## Required journeys and acceptance
- [ ] Explicit build identity/setup over existing projects; distinguish whole robot, mechanism and prototype; no complete CAD required.
- [ ] First-class assembly creation and hierarchy, responsible person, quantities and optional date; existing records mapped without duplication.
- [ ] Add/import requirements in assembly context; manual and CAD reconciliation; quantities not multiplied twice.
- [ ] Combined stock/make/buy coverage with conserved required/allocated/in-progress/uncovered quantities; purchases reused.
- [ ] Part → production carries exact identity/quantity/revision; saved draft before readiness; actionable release blockers.
- [ ] Student queue → instructions → operation/progress/problem → inspection; single job context, recoverable drafts, explicit save state.
- [ ] Partial accepted/rework/scrap/held quantities and replacement flow; no automatic material refunds or fabricated accepted stock.
- [ ] Assembly requirements → available suitable components → assembly instructions → testing; installation optional; failure/correction/retest retains history.
- [ ] Exact CAD context and return links; newer revision does not overwrite approved work; access denial does not imply missing design.
- [ ] Roles and existing permission boundaries clear before forms; concurrency/offline/uncertain saves/history retained.
- [ ] EN/HE desktop/mobile visual and behavioral verification; existing builds preserved; isolated end-to-end fixture, no fabricated production manufacturing.
- [ ] Required CI, database preflight where applicable, production deployment/acceptance, checkpoint.

## Screen contracts
Dashboard: student sees assigned actionable work; leader sees unassigned work, blockers/reviews and first setup action. Counts are links into filtered records, not a robot-readiness certification.
Assemblies & parts: requirements, scoped search with counts, visible add/import, select item then source/plan. Advanced revision/reconciliation history secondary; remains accessible. Equipment is a reusable operation resource, not a consumed part.
Workshop: My work/Team work/Inspections in one segmented navigation. Selected work keeps instructions and review together. Linking legacy jobs is a secondary recovery path, never the normal CTA.
Assembly & testing: start from assembly/kit requirements; preparation, assembly, bench tests, optional installation/robot checks. Event handoff is secondary after assembly work.

## Existing implementation facts
RobotBuildPage currently wraps team_projects; BuildSubsystems only groups tasks and is NOT a parts hierarchy. ProjectBom has one disposition/inventory/job per requirement. prepare_robot_build_work requires full matching quantity and released manufacturing is started separately. Existing kits link inspected batches and installations. These constraints require explicit data evolution for hierarchy and combined coverage; renaming tabs alone cannot satisfy this contract.

## Verification discipline
Reuse existing server RPC protections. Test changed quantity/permission logic against isolated database fixtures. Do not repeat unrelated tests after passing without new changes. Distinguish implemented, tested, deployed and actual workshop acceptance. Student uncoached pilot remains a human usability acceptance, not something a synthetic test proves.

## Progress
Initial source mapping completed. No schema or UI change has been deployed for phase 1.

### Local implementation checkpoint (not released)
- Added action-focused dashboard and grouped workshop queue with blocked/unassigned filters.
- Parts search now has explicit scope/count; part-to-production route prefills reviewed requirement. Revision tools and legacy job linking are secondary; event handoff moved below assembly work.
- Added additive assembly identity/hierarchy/membership migration and UI. Quantities are explicitly total-build quantities, not parent multipliers. Membership cannot exceed demand; reducing demand below membership is blocked. Atomic manual requirement creation in assembly context is provided.
- Isolated database test passes hierarchy cycle rejection, idempotent retry, payload mismatch, quantity conservation, stale revision, RPC-only writes and leader restrictions. Existing fixture also exercises manufacturing/QC/installation guards. TypeScript passed before the final small copy/row-quantity adjustments.
- NOT COMPLETE: mixed sourcing under one requirement, guided assembly/test task creation, exact CAD Mentor revision handoff, explicit build setup and remaining UX/authorization verification. Existing subsystem-task grouping is retained and not treated as the new assembly hierarchy.
- No phase-1 schema applied to production; no frontend push/deployment. Do not deploy current frontend before its additive migration and complete workflow acceptance. No APK changes. No fabricated production records.
- Next implementation: finish mixed sourcing and assembly/test orchestration, resolve existing-work and manual/import membership paths, then integrated fixtures + browser EN/HE acceptance and controlled release. Keep the checklist open until real evidence exists.

### Active continuation — implementation resumed
- Added assembly editing, persisted-quantity prefill/save receipt, and assembly context across build tabs.
- Added pinned CAD workspace resolution (including older snapshots outside the latest 30) and return-to-build links. Automatic revision replacement is disabled for a pinned build review. Not yet deployed.
- Added guided assembly/component-plan and dependent bench-test creation. Existing review functions remain authoritative; submission requires complete issued components. Isolated creation/retry/permission checks pass; full submission/retest acceptance still pending.
- Added conserved mixed sourcing for uncommitted requirements (six plates = stock two + manufacture four); existing job/purchase/kit history cannot be rewritten. The split form now distributes existing assembly quantities between sources in the same transaction. Tests confirm both the overall six-part requirement and assigned assembly totals remain six; no manual removal/recreation is needed.
- TypeScript passed before the latest component-layout changes. Local browser verified assembly context survives navigation. Browser review exposed remaining assembly-screen overload; component actions and secondary maintenance controls are being simplified.
- Still IN DEVELOPMENT; no production deployment or migration application. Required CI, complete fixture journeys, EN/HE mobile and production acceptance are outstanding. Do not present this continuation as a finished phase.

### Release preparation — 10 October 2026
- Focused Phase 1 isolated database test passed, including failed inspection → reopen → return/reissue components → fresh assembly and bench approval; failed evidence retained. Mixed sourcing, exact totals, retry, stale revision and authorization guards passed.
- All 33 relevant additive migrations applied twice together in the isolated release rehearsal. TypeScript and Vite production build passed. Existing large-bundle warning remains.
- Production rollback-only schema preflight passed (five new RLS-enabled tables). The same three additive migrations were then committed successfully in production. Existing records were not fabricated or changed for acceptance.
- CAD connector source prepared and verified against the editor with normalized line endings; frontend release and production acceptance are still pending at this checkpoint.
- Explicit limitation: split sourcing is a planning action before allocation/purchasing/manufacturing history exists. Later executed quantities retain their original audit trail; there is no silent rewrite.
