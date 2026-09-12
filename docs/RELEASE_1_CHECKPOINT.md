# Release 1 checkpoint — 2026-09-12

## Latest continuation — 2026-09-13

Implemented locally: recursive upstream enforcement and change-impact list; saved immutable project robot/prototype configuration revisions and finding snapshots; 1–5 required stage reviewers with all-reviewer consensus and vote invalidation when findings change. Expanded SQL tests pass across these cases. TypeScript and Vite build passed (existing bundle-size warning). Narrow Hebrew combined form fixture inspected; desktop form inspection previously completed. These component fixtures are NOT the hosted integrated preview or physical-phone acceptance.

All six migrations rehearsed successfully against RECOVERY ooqwgylckjvfpkshhexm, never production. Production untouched. Execution order: evidence, requirements, results, change_impact, robot_configurations, consensus. Combined reviewed replay: docs/baseline-0/release-1-rehearsal.sql. Recovery remains restricted real-data recovery copy, not routine QA staging. New configuration records are immutable snapshots, not automated CAD/BOM synchronization. Transitive blocking preserves completed task status and flags impacted work; does not silently undo physical work.

Remaining release gates: integrated role/UI acceptance and production approval, then production migration + web rollout + one APK. No commit/push/production deployment/APK performed. Baseline function/config parity and automatic future file backup remain open as documented; do not claim all V5.2 complete. New local synthetic form preview runs http://127.0.0.1:4207/ (add ?he=1&mobile=1 for narrow Hebrew fixture).

## Next release sequence

1. Complete integrated synthetic role acceptance; component fixtures alone do not meet this gate.
2. Prepare a hosted preview against a compatible isolated database. Do not use the real-data recovery copy for routine QA.
3. After acceptance, apply the six production migrations before promoting the matching frontend.
4. Build one signed APK from the accepted release.

Latest TypeScript check passed after the final UI adjustment. Git diff check passed. Preserve the two existing Android .idea changes. This Release 1 work is a subset of V5.2, not completion of the entire blueprint.


## Integrated browser acceptance — 2026-09-13
Real ProjectTaskReview UI connected to synthetic PGlite SQL through localhost:4208. Browser verified: dependent transition rejected before review; physical evidence/configuration finding saved; first mentor vote remains pending (1/2); second vote completes source (2/2); student can complete dependent; student submits revised evidence; source returns to in_progress, votes/results reset, dependent progress rejected again. Existing completed work preserved. Multi-reviewer button label changed to Record approval. Harness executes the SQL regression suite on startup. This validates component-to-RPC integration, not hosted Supabase Auth/PostgREST, full app notification routing or physical phone acceptance. No production changes.

