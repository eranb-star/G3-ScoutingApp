# Baseline 0 — V5.2 engineering platform

**Current status:** see [Phase 0/1 delivery record](../PHASE_0_1_STATUS_20260913.md). This original inventory below is historical. Scheduled encrypted local backup is now installed and verified, database restoration/replay is recorded, production engineering is deployed, and APK 2.1.9 is built. Full disaster-recovery and physical-device acceptance must not be inferred from the successful component checks.

Captured 2026-09-12. Status: evidence collection and Release 1 contract drafted; baseline acceptance remains open. No application code, database structure, production data or deployments changed.

## Accountable owner

Eran Bongart confirmed responsibility for engineering/review rules and platform/recovery decisions. Other mentor assignments may be delegated. This confirms ownership, not approval of every policy proposed below.

## Recorded evidence

- Repository: `web-portal-preview`, commit `29c1ec84cedf2985b6be3115fe30c069b1d11059`.
- `local-inventory.json`: 1,072 tracked files; declarations from 75 SQL files; literal dependencies from 178 frontend source files; 13 Edge Function sources across BOTH function directories. Includes SHA-256 hashes and APK identity. Static extraction does not prove deployment parity or runtime permissions.
- `live-catalog.json`: authenticated read-only SQL against Supabase `hnqwhuuxlqfyawqymaaz`; 136 relations, 1,280 columns, 529 constraints, 299 policies, 115 routines, 60 triggers, 266 indexes, 3,572 grants, 8 extensions and 4 buckets. Every result count matched parsed details. Definitions of routines are hashed, not exported. No application rows or secret values were collected.
- `live-catalog-readonly.sql`: reproducible catalog query. Category fingerprints identify this snapshot; they are not a database backup.
- `local-test-results.json`: 25 local scripts executed; 24 passed, one source-text assertion failed. All 11 local test scripts passed. Live-schema and UI-preview scripts were not included in this batch.
- TypeScript and Vite production build passed. Vite reports the existing main bundle above 500 kB; performance on school networks/phones is not established by a successful build.
- Existing signed APK 2.1.7 / code 21 identity remains recorded in the inventory and main handoff. No new APK produced.

## Findings

1. `verify-mobile-notification-stability.mjs` expects LF in a literal source substring. Current checkout has CRLF: raw comparison fails, newline-normalized comparison passes; forbidden loading-reset pattern is absent. This explains this assertion failure, but is not a behavioral race test. Record the suite as 24/25, not all green. Normalize this checker and add a focused behavioral test when auth is next changed.
2. All catalogued ordinary tables except `public.guest_access` have RLS enabled. That table has explicit grants only to postgres/service_role in the captured grant list; do not label it publicly exposed solely because RLS is disabled. Full effective-role, view and security-definer review remains necessary.
3. CI currently builds the web app; it does not enforce the complete permission/SQL test matrix. Existing static verifiers are supporting checks, not proof of end-to-end acceptance.
4. Engineering approvals already exist. Extend task review gates, submissions, dependencies and action synchronization; do not create an unrelated approval engine.

## Acceptance still required before Release 1 implementation

| Item | Current state | Completion evidence |
| --- | --- | --- |
| Production web identity | Verified deployment CUKpN9E8LnkZFMbUYvLC2QL9dmPR, SHA 72e849a; later repo commit changes only Android version/handoff | See deployment-verification.md; exact creation timestamp remains unrecorded |
| Edge deployment parity | 13 repository function sources inventoried | Current deployed versions and source/config hashes reconciled, including dashboard-only functions |
| Scheduled jobs/configuration | One active 15-minute job captured with command hash | Execution health and other configuration identifiers remain to verify |
| Recovery | Owner upgraded to Pro; dashboard confirms scheduled backups, latest 2026-09-12 01:15:59 UTC | Storage objects excluded; approved objectives and isolated restore rehearsal remain open |
| Staging | Separate isolated test target not verified | Synthetic accounts, blocked external side effects, migration/rollback rehearsal |
| Permissions | Catalog and local checks captured | Positive/negative actor tests including self-review, cross-team access, QA restrictions and stale revisions |
| Release 1 policy | Draft in release-1-contract.md | Owner accepts stage/reviewer/override and evidence rules |

Do not represent these pending items as completed. Keep production read-only during remaining discovery. Do not run arbitrary historical SQL files as a migration sequence. Do not promote or rebuild an APK merely to deliver these documents.

## Recovery proposal for owner decision

Determine available backup/PITR capabilities before promising targets. Initial planning targets: RPO at most 24 hours, RTO at most 4 hours, daily recovery points retained 30 days. These are proposals, not guarantees or approved requirements. Include database, Storage evidence files, function/config versions and secrets recovery procedure; a database-only restore is insufficient. Restore to isolation and validate authorization, evidence integrity and task/dependency consistency. Select final targets based on measured recovery and acceptable team data loss; shorter RPO may require a different backup arrangement.

## Reproduction

Run `capture-local.py` for local metadata only; `--test` additionally runs the classified local scripts with the documented PGLite module available. Review classification before adding scripts. The live SQL must be executed only in the verified project. Generated artifacts contain internal schema metadata: retain within the project rather than publishing as public documentation.
