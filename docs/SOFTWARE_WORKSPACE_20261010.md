# Software workspace release — 10 October 2026

## Authorized scope
Complete the software-team workflow improvements identified in the 10 October review. Reuse Engineering Hub, G3 Assist, Projects, robot test records and Field & Robot Studio. No new robot code access, GitHub writes, robot deployment, CAD/CAM work or APK build.

## Implemented flow
1. Engineering Hub → Robot Software has visible Code & review, Logs & diagnosis, Autonomous, Tests & results destinations. Repositories use compact rows. Existing CAD entrance remains available in Code & review.
2. Optional working repository and exact resolved SHA are retained for the signed-in member in session storage. Planning and Assist can use that revision explicitly. This is never treated as the code deployed on the robot.
3. Open a local WPILOG (32 MB maximum), choose a recorded operating-mode interval or custom window, inspect an actual logged signal/group, and pin up to three related signals. Shared cursor, independent vertical scales, finite-sample statistics and explicit unknown units. Structured component comparisons require matching component layouts.
4. Charts, statistics, excerpts, JSON export and test evidence use the selected interval. Comparison accepts a separate interval in the second run, aligns starts, and does not infer improvement or matching conditions.
5. Return from Assist/test destinations keeps the parsed run and choices in member-scoped memory. After refresh, reopen the same file; matching SHA-256 restores selections. Raw log samples are not persisted/uploaded. Comparison file and search filter are not retained.
6. Assist receives only the reviewed primary-signal excerpt, at most 20 sampled values plus extrema, within the existing bounded prompt. Related traces are for local inspection; their statistics can accompany test evidence. When an explicitly verified comparison revision is passed, Send requires that exact repository/revision to be attached, preventing an accidental latest-code fallback.
7. A private-code answer can produce a human-reviewed follow-up: title, shareable summary, measurable criterion, explicit sharing acknowledgment → existing project/owner selection → existing task. Private source/AI answer is not copied. Original conversation link appears only for the source owner. Existing project assignment and private-code permissions apply server-side.
8. Log → test draft carries file hash, interval, partial flag, explicit physical/simulation choice, optional code association and bounded signal statistics. Readable evidence precedes optional technical JSON. No outcome is inferred. Existing immutable trial/correction/retest workflow remains in use.
9. Autonomous links to existing Studio planning and one Review code export destination. Pinned code can be used explicitly. Review in IDE, manual build and physical validation remain necessary. OFFSEASON_2026 exporter remains drive/wait only; mechanisms require actual team implementation.

## Database and privacy
Applied `backend/supabase/software_reviewed_followup_20261010.sql` to existing production project. Additive RPC only; reuses task/context tables and existing creation function. Active member, project permission, source ownership, private-code permission, reviewed-text bounds, advisory lock/idempotency enforced. No new permission grants to users, no new table or raw-log upload.
Production acceptance transaction created the synthetic task/context, checked repeated request identity and exact safe-text-only content, then rolled back. Result: “Reviewed follow-up and idempotency passed; rolled back”. No synthetic task remains from that transaction.

## Verification
- TypeScript and Vite production build passed. Existing large-chunk warnings remain.
- Focused parser/integration, reviewed SQL task, Assist decision, private software mentor and team-learning tests passed.
- New SQL test registered in existing CI and honors PGLITE_MODULE; no CI gates removed.
- Actual supplied offseason WPILOG: 49,720 records /151 channels, partial tail. Selected teleop 31.037174–42.490946 s gave 499 BatteryVoltage samples, mean 11.84016. Full-run mean differs as expected.
- Local browser: interval/pinned signal preserved through Assist return; refresh/reopen same hash restored them; comparison same teleop interval matched; test draft carried the interval/statistics and explicit physical choice. EN/HE rendered. Browser viewport override did not change reported viewport; do not claim a verified 390px or physical-phone run.
- Existing simulation/VR computation untouched; planner export entry presentation changed. No new paid AI generation or physical robot test performed.

## Release status
Application commit/CI/deployment evidence will be recorded in the authoritative checkpoint after release. Previous live release before this change: d93cf777 / Vercel 6KDis92EGZSSSiX8fLTpw2WdZQwh. Additive SQL can remain if frontend is rolled back.

## Deliberately open
GitHub remains read-only at user request. App-triggered fixed build/test workflow would return compile results for a selected revision inside G3, but requires separate Actions authorization/token permissions and is deferred. No automatic robot deployment. Installed APK remains older; this release targets the website. Physical acceptance and mechanism-specific autonomous integration are not implied by the software workflow release.
