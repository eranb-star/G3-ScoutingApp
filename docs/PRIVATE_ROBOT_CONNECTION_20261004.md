# Repository entry-flow correction — 4 October (current)
The initial private-connection release passed manual attachment acceptance but missed Engineering Hub → Ask G3 Assist → type question. The user's SysId conversation had `software_context = NULL` in production. Its generic answer was a context-routing defect, not a token failure. Earlier claims of complete entry-flow acceptance are superseded.

## Corrected behavior
- Repository entry resolves the current default-branch commit and automatically selects up to six relevant source files before sending the question. Manual file selection is optional. Retrieval failure blocks generation; the backend also rejects repository-bound requests without matching code context.
- First correction `0d814e3` exposed another defect during live testing: the 21 KB whole-file selection budget skipped large implementation files and selected constants instead. Correction `11d5304` ranks subsystem implementations above utility/constants files, supports source files up to 128 KB, and supplies bounded question-relevant excerpts with original line numbers. Combined evidence remains limited to 22 KB. Citations to omitted lines are rejected.
- Exact commit and selected files are saved with the conversation. Follow-ups keep those files/commit, with excerpts selected for the new question. New conversations refresh the current revision. Existing histories with no code require New; the old generic answer is not retroactively corrected.
- This is deterministic filename/subsystem and source-line retrieval, not whole-repository semantic indexing. No code is compiled, executed or deployed to the robot. Generated implementation examples are explicitly uncompiled; citation checks establish that referenced lines were supplied, not that every generated recommendation is correct.
- Existing Admin-default private permission, paid-AI permission, private cache restrictions and budgets remain unchanged. No new migration or APK.

## Release and acceptance
Implementation: `0d814e3` + `11d5304`; isolated release source `0e58a59`. Updated bundled frc-assistant deployed to production. Web production promotion `2fm9FjH1nH7Rt9PsmivpSbbnE9Rd` from preview `FmzZ27LFnP3xkSBqLdsQCLTngWsq`; Ready verified at https://g3-6740.com. Final reload confirmed the new repository-specific welcome and source-code wording. History reopened the successful six-file answer with pinned context intact. Local visual proof: docs/staging/repository-analysis-correction-20261004.png (not committed because it contains private code findings).

Production acceptance used Engineering Hub → Rebuilt_2026 → Ask G3 Assist, without opening the picker, and the exact user question “On the rebuilt_2026 repository, how can we implemet sysid?”. The corrected retrieval included Flywheel.java, Intake.java, Swerve.java, SwerveModule.java, RobotContainer.java and Conveyor.java at `419a7aa105e9635d7b512dea4cd4334c1fd13488`. Answer identified concrete motor/feedforward implementations with ten code citations and asked which subsystem to characterize. Flywheel's cited ffTest lines 74–77 were independently checked in GitHub. Database confirmed automatic=true and the six paths persisted at 16:34:42 UTC. Gemini budget ledger: settled 23,284 microUSD ($0.023284); preceding test that exposed the size/ranking gap settled 20,478 microUSD. No repeated paid call after those two tests.

Regression tests passed: failed automatic read, denied private selection, exact revisions, source excerpt budget, original line numbers, rejection of omitted-line citations, private allowlist, secret exclusion, ownership RLS and repeatable context migration. Existing G3 Assist access/execution suite and TypeScript passed. Vercel builds verify release compilation. Preserve the test that starts from the repository button; manual picker acceptance is insufficient.

## Remaining boundaries
Automatic selection is capped at six files and 128 KB per source. Follow-up questions requiring different files need a new conversation/manual selection. Imported logs are not automatically matched to these commits. No promise of compile-ready generated patches: the acceptance answer contained an illustrative example and does not establish API/build correctness. Actual build validation and hardware testing remain separate work. Private-code sharing permissions are not expanded by this correction.

# Private robot connection — 4 October 2026

## Initial release status (historical)
Released and live-verified at https://g3-6740.com. Implementation f3c6a52, isolated production source a4ae283, Ready production deployment 9khhmRw58GZXFJnRPwPt64oTeiRG (preview G3Uxf4QfXYWGN8C3ycSTjUg4pZ5c). User approved GitHub access and saved G3_ROBOT_GITHUB_TOKEN in production Edge Function secrets (verified name and update time only). Never read or commit its value. User screenshot establishes expiry 5 October 2027; GitHub approval was reported by user.

## Authoritative robot identities
- GlueGunAndGlitter/Rebuilt_2026, main: season robot source, confirmed by user. No season log available.
- GlueGunAndGlitter/Rebuilt_Practise, main: leaders' advanced learning code; do not call this the offseason robot.
- GlueGunAndGlitter/OFFSEASON_2026, main: offseason project, renamed from Libi_Rebuilt_practice. Browser verified commit 7ca59d3356174ffd0a23c73822a6f1f4ce5e2f09; live branch may advance.
- Supplied akit_26-09-23_16-32-21.wpilog belongs to new learning code, NOT Rebuilt_2026. Local read-only inspection: 1,081,344 bytes, 49,720 complete records, 151 entries, about 44.76 seconds, about 11.45 seconds enabled, no autonomous interval. Metadata refers to Rebuilt_Practise; exact source commit unverified. Truncated final header; preceding records readable. No log uploaded or imported by this increment.

## Initial release flow and boundaries (historical; corrected above)
Engineering Hub lists authorized private repositories with distinct purposes and an Ask G3 Assist entry. Choose a repository, resolve branch to exact commit, select up to six supported small source files, attach and send a question. Merely choosing files does not run paid AI. Explain/diagnose/review use existing code citations and owner-only conversation history. Selected code is processed by Gemini as disclosed in the UI.

Separate use_private_robot_code permission defaults only to Admin; existing paid-AI permission is additionally required. Administrators can explicitly grant other roles through existing permission management. Backend checks active membership and permission on every private read/generation. Read-only server key is attached only to three fixed repository identities. No persistent frontend catalogue or shared private source cache. Tokens never reach responses. One-click publication to shared knowledge/tasks/issues is hidden for private-code conversations. Owner-only historical answers remain after permission revocation; revocation blocks new code reads, not knowledge already received.

Scope remains selected-file analysis: 24 KB individual file filter, 22 KB combined source, six files, bounded GitHub requests. No whole-repository indexing, robot deployment, executed build, automatic autonomous adapter generation, or automatic log/code matching. Existing route scaffold is still not calibrated robot-ready code. APK remains 2.3.0/code25; new web UI is not bundled there.

## Validation and regression controls
Actual catalogue handler tests cover active membership, unauthenticated rejection, permission denial with zero private network reads, fixed three-repository token use and no token response. Software Mentor tests cover exact commits, bounded context, excluded secrets/symlinks, private allowlist and line citations. Existing G3 Assist permission/budget suite passes with repeatable new migration. Windows sandbox blocked esbuild ancestor-directory access; same regression passed outside sandbox. TypeScript/build and live results recorded below when completed.

## Deployment and rollback
Use private_robot_access_20261004.sql (additive, rerunnable, preserves explicit role decisions), then bundled github-repositories and frc-assistant handlers. Deploy only reviewed changes through codex/knowledge-protection-release. Existing JWT gateway verification remains enabled. Roll back frontend/handlers independently; additive permission may remain. Disable private permission or revoke key to stop future private reads. Do not remove historical conversations or student records.

## Next work after connection
Repository-bound build/code-generation adapter and real robot/log acceptance remain distinct work. Do not repeat delivered Software Mentor, official ingestion, training, budgets or VR foundation. The old assumption that private source and all logs are unavailable is superseded by the identities and limited log evidence above.

## Production acceptance — completed 4 October
- User explicitly confirmed enabling private reads and selected-code Gemini processing for existing Admins. Production SQL rollback preview passed, then additive migration committed. Live role check: Admin true; Member, Mentor and Team leader false. No broad student grant.
- Both github-repositories and frc-assistant bundles deployed through Supabase; editor contents matched prepared bundles before deployment. Existing JWT verification retained. Website built and promoted from the isolated release branch, source a4ae283; live production domain and Ready deployment verified.
- Authenticated Engineering Hub showed 13 accessible repositories, including all three private projects with correct purposes, connection-success status and Ask G3 Assist links.
- Actual server file-picker reads resolved main to Rebuilt_2026 419a7aa105e9635d7b512dea4cd4334c1fd13488, Rebuilt_Practise c63c78904f5ea7f831918e496b63d17f28c34569, OFFSEASON_2026 a8b2524a7687a08ac36c66d9204a351651f482fe. Offseason advanced since the earlier browser check: preserve commit pinning, never assume the old SHA is current.
- One live paid request selected OFFSEASON_2026 Robot.java and RobotContainer.java, asking how autonomous starts and teleop cancels it. The answer correctly described the hardcoded Autos.exampleAuto selection, scheduler start, cancellation and missing implementation evidence; seven exact-commit line citations. Relevant GitHub source was independently inspected. No claim of a dashboard chooser or executed robot build.
- Reload and reopen from History restored the two saved messages and private code context. Shared publish/task/issue controls were absent. The budget ledger recorded one settled gemini-3.6-flash attempt, 7,946 micro-USD ($0.007946); no repeat paid test.
- TypeScript, production Vite build, Software Mentor, private-catalogue and G3 Assist access regressions passed. Existing large-bundle warnings remain. Desktop production layout had no horizontal overflow. Viewport emulation did not apply to the target tab, so this run does not establish a fresh mobile/RTL acceptance; existing responsive styles/localization are reused, with no layout changes.
- Screenshots: docs/staging/private-robot-production-20261004.png and private-assist-production-20261004.png (local proof; private-code-derived answer is not published as shared knowledge).

## Operational instructions
Use Engineering Hub → desired robot → Ask G3 Assist → Choose robot code → Read revision & choose files → Attach files → type question → Send. Code selection itself makes no Gemini call. Start a new conversation to read a newer commit. Each private GitHub citation still requires the reader's own GitHub access to open on github.com; G3's server key does not sign the browser into GitHub.
For other roles, Admin must explicitly enable Read private robot code in Roles & permissions; paid G3 Assist permission is also needed. Key rotation/expiry or removed repository approval produces a connection error rather than falling back to unrelated public code. The key name is G3_ROBOT_GITHUB_TOKEN, stored only in production Edge Function secrets.

No APK was rebuilt. No private source repository was modified. Remaining robot-code generator/build/calibration and verified log matching remain next increments, not prerequisites for the now-working selected-code mentor.
