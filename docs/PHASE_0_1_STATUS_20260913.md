# Phase 0 and Phase 1 — authoritative delivery record

Updated 2026-09-13. Owner: Eran Bongart. This record supersedes the dated progress notes in PROJECT_HANDOFF, RELEASE_1_CHECKPOINT, the acceptance ledger and baseline README. It distinguishes implemented/deployed work from acceptance that has not been performed. It does not declare the whole V5.2 blueprint complete.

## Running release

- Production: https://g3-6740.com
- Frontend commit: `4bd440fe9e4cf491afed0147fd811818d4629a73`.
- Production Vercel deployment: `2PS7QM23VoFXfnadP61cGc8LX9vP`, rebuilt with production environment, Ready. Unique URL: https://g3-scouting-app-5qpe-94eakkb6t-eranbos-projects.vercel.app
- Public bundle verified HTTP 200, production Supabase reference present, QA reference absent, archive and independent-exception controls present.
- All thirteen additional engineering migrations applied atomically to production `hnqwhuuxlqfyawqymaaz`, after isolated QA and recovery replay. Success result: `production_engineering_13_20260913`.
- Signed APK: `releases/G3-Team-Hub-2.1.9.apk`, package `com.g3.scouting`, version code 23, 4,699,960 bytes.
- APK SHA-256: `3c6e4e3995b1630ec947b5f5e5297827377c6b887c45ab64eba9bdd180a3795b`.
- Signing certificate SHA-256: `45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580`.
- Release build and Crashlytics mapping upload succeeded. Signature and manifest verified. All nineteen packaged web files match the accepted production-configured local build. No QA reference or remote Capacitor server setting in the APK.

## Phase 1 delivered scope

| Area | Implemented behavior | Verification |
|---|---|---|
| Task deletion/lifecycle | Reviewed tasks offer explicit inline Archive task / Cancel instead of a foreign-key failure. Review evidence and decisions remain intact. Archive removes active responsibility; restore is available. Project restore uses planning. | SQL lifecycle/source visibility tests, build and CI. Authenticated QA archive view showed the approved task and preserved review; Restore task succeeded, returned it to active work still approved and removed the dependent impact alert. Final inline offer itself has not been exercised in an authenticated hosted browser. |
| Requirements/interfaces/decisions | Versioned records, owners, hierarchy/allocation and relationship links, revision history, conflicts and immutable conflict resolution, checkpoint coverage. | Integrated SQL tests, hosted actor transaction. Coverage is checkpoint linkage, not a claim that all requirements passed. |
| Quantitative criteria | Canonical units, bounded finite min/max/tolerance and measured-result validation. Requirement changes invalidate dependent release evidence. | Boundary/revision SQL tests. |
| Review workflow | Named stages, capability checks, independent reviewers, parallel/sequential ordering and immutable policy snapshots. Assignment alone is not submission. | Local integrated flow, earlier hosted student/two-mentor flow, updated hosted SQL actor acceptance. |
| Critical exceptions | Scoped expiring override, risk/configuration/reason, independent countersignature, proposer permission rechecked, no self-authorization. | SQL tests including revoked proposer and expiration/role guards. |
| Exact evidence | Multiple typed artifacts with fixed source identity and optional hash. Reviewer access attestations. Missing/changed evidence invalidates the submission. | SQL tests and component checks. Access confirmation is manual, not automatic external-link monitoring. |
| Physical validation | Measurements, units, sample count, instrument/calibration/conditions, physical serial registry, immutable design/built/installed configurations and software identity. | SQL tests including asset/configuration consistency. |
| Change impact | Pinned revision lineage and selective dimensions; affected root and downstream gates remain visible. Completed historical work is preserved while release validity is marked stale. | SQL regression for roots/descendants; Home, Work and Projects share impact UI and change notification. |
| Operating controls | Administrator pause preserves readable history and blocks new review decisions, including intermediate votes. | SQL authorization/pause tests. |
| Drafts/network | Session-scoped drafts; server expected-revision/idempotency guards; offline approvals/submissions cannot unlock work. | Draft and actor tests. No offline approval queue is claimed. |

## Phase 0 completed evidence

- Separate synthetic QA project `cyooubycafubbnkjcqlw`; recovery clone `ooqwgylckjvfpkshhexm` remains real-data recovery only. Do not use the clone for routine QA or re-enable its disabled production scheduler.
- Database backup restored to the separate recovery project. Ten catalog fingerprints matched after the two historical migration replays. The thirteen current engineering migrations subsequently replayed successfully there as well.
- All fifteen deployed Edge Function main sources captured in an encrypted local archive. Repository/runtime comparison recorded in `baseline-0/edge-source-audit-20260913.json`; known drift classified below. No private source archive or credential committed.
- Found a real scheduler failure: duplicated deployed source caused HTTP 503 BOOT_ERROR despite successful cron SQL. Restored the repository single-copy source. Actual scheduled HTTP 200 observed at 06:00 UTC on September 13.
- Encrypted local Storage backups now configured: Windows task **G3 Encrypted Storage Backup**, daily 21:00 local and at Windows sign-in, limited current-user execution, retries and no concurrent runs. Requires that Windows profile and internet. Earlier snapshots retained; no automatic pruning.
- A scheduler-triggered run finished with LastTaskResult 0. Verified snapshot `g3-storage-20260913T063817Z-9567f4.g3backup`, SHA-256 `a64c6227f1b359064372d2b91238b814340351136e0939318d1a81d2b55faf3b`. Current production Storage has zero objects, so the verified zero-file snapshot is correct.
- That actual snapshot restored successfully to a new ignored local test directory using the protected Windows key. Separate nonempty synthetic tests passed encryption, incorrect-password/tamper rejection, exact restored bytes and overwrite protection.
- Managed credentials and backup password are encrypted with Windows DPAPI CurrentUser in ignored `docs/staging/backup-config.local.dpapi`. Snapshots and `latest-storage-backup.json` are in `C:/Users/user/Documents/G3-Backups`. This is local/profile-bound protection, not portable offsite disaster recovery.
- CI runs 34739838593 (75b81f0), 34741587874 (6cb2206), and **34742388037 (4bd440f)** completed successfully. Current frontend release passed TypeScript, Vite and integrated SQL/lifecycle/draft/queue/mobile-source checks. Existing bundle-size warning remains.
- Recovered the existing synthetic QA browser session in a fresh tab without resetting credentials. QA task `ae81a8b7-f5ba-4000-a249-fbc06af66b00` was observed archived with its Approved checkpoint intact and then successfully restored through the app. This was isolated QA, not a real member's production task.

## Source drift disposition

- `scheduled-operations`: defective duplicate deployed source replaced; actual cron HTTP success verified.
- `attendance`: formatting/declaration/template differences observed; preserve captured deployed source as recovery baseline. No claim of complete semantic equivalence from token comparison.
- `frc-assistant`: two deployed Hebrew strings differ from the corrected repository text. This pre-existing source drift is recorded; this release did not redeploy that function.
- `github-repositories`: deployed version provides public repository lookup; repository version adds authenticated/private lookup. Preserve the deployed baseline; do not silently expand private-repository behavior during recovery.
- `hyper-responder` and `is_admin`: dashboard-only legacy source captured, not deleted. Recovery must use the captured source unless separately replaced and tested.

## Remaining acceptance — do not label these done

1. **Physical device and representative school network:** no connected Android device was available (ADB returned zero devices). APK installation, push behavior and school filtering/offline behavior have not been tested on those environments.
2. **Full disaster recovery:** local object recovery and database/schema restoration are verified separately. Full application/auth/external-secret configuration recovery, a nonempty cloud object restore with access rules, portable recovery-key protection and measured end-to-end RTO have not been demonstrated. Proposed 24-hour RPO / 4-hour RTO are not guarantees.
3. **Final integrated UI acceptance:** new inline archive offer and the entire expanded control matrix have not all been exercised through authenticated hosted UI. SQL role/security acceptance and earlier hosted core review flow passed; these are distinct evidence.
4. **Baseline parity:** captured legacy functions and the three described source differences are preserved and classified, not all reconciled into identical repository/deployed artifacts. A comprehensive effective-permission audit of every pre-existing application surface is not implied by the engineering actor tests.

The implementation and release work above is deployed. **Unqualified end-to-end acceptance of both phases remains open for these specific items.** Do not move the goalposts by calling a deployed subset or simulated device test a fully accepted phase.

## Continuation and rollback

- No further engineering migration or APK build is needed merely to repeat this release. Use the production URL and APK above.
- Preserve user changes in `android/.idea/deploymentTargetSelector.xml` and `android/.idea/misc.xml`.
- Prior web rollback deployment: `C6wLiAH8eTjyuji3rt9UEyknn4HU`, frontend `321ccc4764029aa92eaa9c7971030a7a3dc258bc`. Prior APK 2.1.8 retained. Prefer pause controls / forward fixes for used engineering records. Do not restore the production database to undo UI without accounting for subsequent team data.
- Managed backup manual run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/baseline-0/run-managed-backup.ps1`.
- Local restore under the same Windows profile: append `-Restore <snapshot.g3backup> -Destination <new-directory>` to that command. Restores locally only, never overwrites existing destinations or writes cloud data.
- Later V5.2 releases remain separate scope. User has authorized continuous completion of Phase 0/1; do not repeatedly ask permission for routine fixes, read-only checks or already-approved release work.
