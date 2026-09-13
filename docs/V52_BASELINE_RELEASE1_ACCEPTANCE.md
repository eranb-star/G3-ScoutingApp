# V5.2 Baseline 0 and Release 1 acceptance ledger

**Current authoritative status:** [Phase 0/1 delivery and acceptance record](PHASE_0_1_STATUS_20260913.md). Production migrations, web rollout, APK 2.1.9 and scheduled local backups are now delivered. The remaining acceptance is explicitly listed there. The entries below are historical snapshots, not the current deployment state.

This ledger supersedes statements implying the September 13 deployment completed all of V5.2 Release 1. A deployed subset is not a completed phase. Scope: V5.2 sections 5–7, 16–17, 82–92, 100–104 and the Release 1 entries in the 32-item decision register.

| Area | Evidence / existing implementation | Outstanding acceptance |
|---|---|---|
| Running baseline | Catalog, repo inventory, production deployment/APK fingerprints in baseline-0 and production release record | Deployed Edge source/config reconciliation; effective permissions audit |
| Recovery | Isolated DB restore/catalog replay; encrypted empty Storage backup | Full app/config/file recovery; measured end-to-end RTO; continuing object backup and retention |
| Isolation | Separate Free QA project, synthetic accounts, no copied outbound secrets | QA switching/integration acceptance where applicable |
| Automated gates | SQL actor/revision/dependency tests, TypeScript | CI integration; explicit local-only test classification |
| Task lifecycle | Existing source-owned notifications and archive reconciliation | Friendly protected deletion, discoverable archive/restore, reviewed-task regression |
| Requirements | Immutable milestone criteria and result snapshots | Hierarchy, allocation, conflicts, canonical units/tolerance, revision history, coverage |
| Interfaces | Schedule dependencies exist | Versioned provider/consumer engineering contracts and impact |
| Decision taxonomy | Multi-reviewer consensus and audit | Explicit stage types, capability policy, configured discipline/sequential rules, scoped overrides |
| Evidence identity | Submission UUID, revision-labelled HTTPS artifacts | Artifact type, immutable source identity/hash, access confirmation and missing-artifact validity |
| Physical tests | Per-requirement finding and immutable configuration snapshot | Structured measurements, units, instrument, conditions, samples, physical asset identity |
| Configuration | Project-scoped immutable configuration records | Design/physical relationships, installed asset identity, software/calibration references |
| Change validity | Recursive task dependency blocking and impact list | Selective dimension/lineage-based validity, decision rationale dependencies |
| Offline/network | Existing core client behavior | Explicit draft/sync/conflict acceptance on representative school/mobile network; never offline release |
| UX | Hosted student/mentor/admin read and review flow checked | Remaining controls, Hebrew/mobile/keyboard, archive lifecycle; physical phone acceptance |
| Disable/rollback | Older RPC compatibility and prior web deployment recorded | Feature-specific read/creation controls and post-use correction semantics |

Owner: Eran Bongart (confirmed engineering and platform/recovery accountability). No additional paid service is authorized by this ledger. Physical school-network/phone tests require actual execution on those devices/networks; local simulations must not be recorded as those tests.

## Current implementation batch — deployed to isolated SQL QA only

2026-09-13 update: the eleven migration batch completed atomically in isolated QA `cyooubycafubbnkjcqlw`. SQL Editor returned `engineering_batch_11_20260913`. Production has not received this batch. TypeScript and Vite build pass; integrated SQL tests now include conflict reopening, exact artifact identities/access, registered asset/configuration lineage and ordered independent reviewers. Hosted UI acceptance and production rollout remain open.

New additions since the earlier inventory below:

- Selective cross-record change dimensions and pinned lineage; cross-project record search and conflict-resolution UI.
- Immutable conflict-resolution audit; revising either participant reopens the conflict and resolution never silently restores an old approval.
- Four explicit engineering capabilities, checked on intermediate votes as well as final decisions; scoped expiring overrides.
- Administrator pause controls preserve readable history.
- Fixed artifact source identifiers, optional SHA-256, reviewer access attestations; a missing/changed report permanently invalidates that submission and requires fresh evidence.
- Physical asset serial registry, design/built/installed configuration parent links, software/calibration identity and server validation.
- Parallel or sequential reviewer order, accountable discipline labels, immutable policy snapshot and server-enforced ordering.

These are implementation/test facts, not evidence that Baseline 0 or all Release 1 acceptance is complete. The remaining baseline recovery/parity, numeric criteria/coverage, critical override policy, full source visibility and final hosted/physical-device acceptance must still be closed.

### Earlier batch inventory (historical; superseded where noted above)

- Protected deletion now offers archive, including project foreign-key restrictions. Archive view includes archived tasks in active projects, with restore. Local SQL regression confirms reviewed-task archive preserves history, cancels responsibility and keeps descendants blocked.
- Physical findings now accept structured value/unit/sample/instrument/calibration/conditions/asset fields through a new authorized RPC. The physical asset is still a textual identifier, not a complete managed asset registry. Existing legacy RPC remains compatible.
- Versioned engineering records for requirements, interface agreements and decision rationale; immutable revision history, owner validation, optimistic concurrency, parent/dependency cycle protection and checkpoint snapshot binding. Generic JSON values do not yet constitute complete canonical-unit/threshold or selective lineage semantics.
- Explicit review-stage configuration and immutable stage snapshot; new submissions require a named stage. This is NOT the complete discipline/capability/sequential/override transition policy.
- Changed linked-record revisions prevent stale release and are included in dependency context and displayed review validity. Full cross-record selective impact and conflict-resolution UI remain incomplete.
- Session-scoped review drafts retain expected submission identity; offline sends are blocked and labelled. This does not prove school-network behavior or implement a background approval queue.
- CI now includes local-only SQL/lifecycle/draft tests on relevant branches. Windows newline normalization fixed in the mobile source verifier. Workflow has not yet run remotely.
- Tests passed locally: engineering-records (includes review-gate suite), archive visibility, draft parsing, project-action consistency, mobile source verifier, TypeScript. Vite build passed before the final impact-label extension; final bundle/hosted/visual acceptance remains required.
- Three principal migrations plus impact context: structured_findings, engineering_records, engineering_impact, review_stages. None applied to hosted QA or production. No new APK created. Do not deploy frontend before matching migrations.

Remaining work is substantive: effective/deployed baseline parity and recovery acceptance; complete requirements/conflict/lineage model; exact artifact identity/access validity; complete approval policy and scoped override; controlled physical-asset/configuration identity; feature disable semantics; integrated UX/role/offline checks. Neither phase is complete.

## 2026-09-13 follow-up evidence

- All thirteen engineering migrations applied atomically to isolated QA: `engineering_batch_13_20260913`. Production engineering schema is unchanged.
- Hosted synthetic actor transaction passed again after the thirteen migrations, including stale root impact visibility; all fixture writes rolled back.
- Numeric canonical-unit/range/tolerance validation, immutable two-person critical-exception policy, revoked proposer rejection, intermediate-vote pause enforcement, and root release invalidation passed local SQL tests.
- Home and Work now include the same source impact view as Projects; engineering changes refresh other tabs; checkpoint coverage and read-only relationship visibility added.
- Project restore uses the actual `planning` status. Protected deletion remains archive with immutable evidence retained.
- TypeScript and Vite passed. The existing large main-bundle warning remains.
- GitHub CI run 34739838593 passed for 75b81f0. Later changes are not covered by that run.
- Baseline source capture contains all fifteen deployed main files, including two dashboard-only functions. Encrypted DPAPI archive is local and Windows-profile-bound; it is not portable disaster recovery.
- Read-only production health: 96 cron SQL runs succeeded in 24 hours, but 24 retained HTTP responses were 503 BOOT_ERROR. Captured deployed scheduler had duplicate source. Restored repository single-copy source through Supabase UI; public-key-only probe now reaches its own 401 guard. Next actual cron result still to verify.

Remaining acceptance is not waived: full recovery/config/object retention, remaining source drift reconciliation, final authenticated preview acceptance, production engineering rollout, and physical-device/network acceptance. No new APK in this batch yet.

### Latest acceptance checkpoint

- QA preview commit 6cb2206 is Ready at https://g3-scouting-app-5qpe-1u5rnukyr-eranbos-projects.vercel.app (Vercel Fd68EAp19ULba5HNPsG8Jh7jBPim). Authenticated synthetic admin successfully opened Home, Work and CAD projects; all team workspaces are accessible from Work.
- The test account is `release-auditor-20260913@g3-qa.invalid`, isolated QA only. No invitation sent. No credentials committed.
- Native confirmation stalled browser automation on tab 86. Reviewed-task archive offer was changed to an inline accessible panel; TypeScript and Vite pass. Hosted check of this last UI change remains pending.
- Scheduled operations recovered: actual cron HTTP 200 at 06:00 UTC after removal of duplicated deployed function source.
- Backup utility now restores verified nonempty bytes into a new local directory without trusting cloud object names as paths or overwriting existing files. Synthetic encryption/restore/corruption/overwrite tests passed. This is local recovery evidence, not a completed cloud file restore.
- Automatic backup is NOT configured: the existing API key reveal/copy controls did not provide a usable credential. No backup configuration or persistent secret was saved. Do not claim ongoing backup coverage.
