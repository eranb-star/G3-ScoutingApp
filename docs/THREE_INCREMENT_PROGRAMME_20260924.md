# Decision support, recovery and engineering acceptance — 24 September 2026

User authorized all three increments, beginning with recovery/permissions. Extend existing features and deploy independently verified increments. Preserve budget, roles, simulator and private user files. Do not claim complete recovery while offsite/key custody or application/auth recovery is unverified.

## Live baseline

- Scheduled local Storage backup last succeeded September 21, missed two runs. Manual September 24 backup captured 12 files / 10,176,996 bytes, encrypted and verified; restored to a new ignored local directory with exact checksums. This is local same-profile recovery, not offsite.
- Destination and separate portable recovery-key custody requested from owner; awaiting answer. No external backup destination invented.
- Production read-only audit: no exposed public tables lacking RLS; two unpinned-search-path legacy import routines. Anonymous EXECUTE exposed unguarded event imports, sync_team_action and close_stale_workshop_sessions. Tightening migration passed local tests and hosted QA and is applied to production. Anonymous/authenticated direct EXECUTE on the four unsafe helpers is now absent. Scheduled jobs continued succeeding. Three legacy role guards additionally changed to reject NULL roles (inactive/missing membership); existing supervisor roles retained.

## Increment acceptance

1. Recovery/permissions: fresh backup and restoration; isolated nonempty cloud-object/access rehearsal; live catalog/role audit and fixes; portable/offsite recovery only to owner-approved destination; external configuration and measured recovery evidence. Keep recovery clone schedulers disabled.
2. Decision support: focused intent/question flow, evidence/assumptions/options/test output, contextual follow-ups, readable EN/HE presentation, saved answer-to-task provenance; representative repeatable evaluations. No second chatbot, corpus reimport or task system.
3. Existing workflow: owner/dependencies, named mentor, changes requested/resubmission, stale requirements, unauthorized/self approvals, duplicate retry and offline draft behavior. Use synthetic QA; preserve production work. Physical phone/workshop checks remain explicit pending items.

## Work discovered

Create task currently transfers only a title, losing the answer, citations and proposed test. Existing Software Mentor review handoff is code-only. Extend these flows using server-verified saved answer provenance and current task/review permissions, with explicit share-to-project preview and retry identity.

## Implemented and checked

- Production migrations: `permission_baseline_20260924.sql`, `permission_null_roles_20260924.sql`, and additive `assist_task_context_20260924.sql`. No role widening, budget change or simulator change.
- Assistant backend deployed and persisted source compared exactly: SHA256 `0d509725c2f0f7f5fa2242f2a18c40ff70b71b1353959cc58a8b99fe5a97d6b2`. Adds practical decision structure and bounded user-question context for short follow-up retrieval. Does not use earlier assistant claims as evidence. Explicit new seasons override prior context.
- Saved answer handoff uses owned message UUID, existing create-task permissions, an atomic immutable question/answer/citation/software-revision snapshot and a per-member retry identity. Saved snapshots remain if the private source conversation is deleted. Explicit UI notice explains sharing to task readers. No automatic mentor approval or passing result.
- Answer headings, tables, lists and code render as safe React text, with expandable source links, EN/HE presentation and larger mobile actions. No raw model HTML execution.
- Task list fetches only embedded snapshot IDs; full answers load when the user opens the context. No per-task background full-answer queries.
- Local tests passed: permission baseline/NULL role denial; actual engineering records/review/requirements/dependency/archive/deletion controls; assistant endpoint access; answer ownership, hidden-project/inactive visibility, source retention, duplicate retry and transaction rollback; EN/HE retrieval context and draft parsing. TypeScript and Vite production build passed (existing large chunk warning remains).
- Hosted QA actor workflow passed with all synthetic writes rolled back. Hosted answer-to-task acceptance also passed after aligning QA's missing existing collaborator routines with production. Production already had these routines; no new collaborator workflow was introduced.
- Browser: actual assistant/project components verified with synthetic answers; interrupted save retains draft; retry creates one task; question, answer, sources and To do state displayed. Hebrew 390px viewport fits without horizontal overflow. This is responsive browser QA, not physical phone acceptance.
- Website deployment and live answer evaluation still pending at this checkpoint; final record below will supersede this line.

## Recovery boundaries

September 24 storage archive: `g3-storage-20260924T080242Z-0fccad.g3backup`, 12 objects / 10,176,996 source bytes. Actual restore to ignored `docs/staging/recovery-20260924.local` verified every object checksum. Existing scheduled backup last automatic success September 21 with two missed runs. Computer/profile dependence is unresolved until offsite/portable recovery is configured. The September 13 recovery clone is historical, contains real data, and is not a routine QA environment.

Still needed: approved independent destination and separate key custody; portable clean-machine restore; nonempty cloud-object access recovery; current database/auth/function/environment reconstruction and measured full-service RPO/RTO. Do not equate local file restoration with complete disaster recovery. Do not commit credentials, restored objects, private data or backup keys.
