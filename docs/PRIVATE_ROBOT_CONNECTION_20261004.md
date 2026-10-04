# Private robot connection — 4 October 2026

## Status
Implementation ready; deployment and authenticated production acceptance pending. User approved GitHub access and saved G3_ROBOT_GITHUB_TOKEN in production Edge Function secrets (verified name and update time only). Never read or commit its value. User screenshot establishes expiry 5 October 2027; GitHub approval was reported by user.

## Authoritative robot identities
- GlueGunAndGlitter/Rebuilt_2026, main: season robot source, confirmed by user. No season log available.
- GlueGunAndGlitter/Rebuilt_Practise, main: leaders' advanced learning code; do not call this the offseason robot.
- GlueGunAndGlitter/OFFSEASON_2026, main: offseason project, renamed from Libi_Rebuilt_practice. Browser verified commit 7ca59d3356174ffd0a23c73822a6f1f4ce5e2f09; live branch may advance.
- Supplied akit_26-09-23_16-32-21.wpilog belongs to new learning code, NOT Rebuilt_2026. Local read-only inspection: 1,081,344 bytes, 49,720 complete records, 151 entries, about 44.76 seconds, about 11.45 seconds enabled, no autonomous interval. Metadata refers to Rebuilt_Practise; exact source commit unverified. Truncated final header; preceding records readable. No log uploaded or imported by this increment.

## Implemented flow and boundaries
Engineering Hub lists authorized private repositories with distinct purposes and an Ask G3 Assist entry. Choose a repository, resolve branch to exact commit, select up to six supported small source files, attach and send a question. Merely choosing files does not run paid AI. Explain/diagnose/review use existing code citations and owner-only conversation history. Selected code is processed by Gemini as disclosed in the UI.

Separate use_private_robot_code permission defaults only to Admin; existing paid-AI permission is additionally required. Administrators can explicitly grant other roles through existing permission management. Backend checks active membership and permission on every private read/generation. Read-only server key is attached only to three fixed repository identities. No persistent frontend catalogue or shared private source cache. Tokens never reach responses. One-click publication to shared knowledge/tasks/issues is hidden for private-code conversations. Owner-only historical answers remain after permission revocation; revocation blocks new code reads, not knowledge already received.

Scope remains selected-file analysis: 24 KB individual file filter, 22 KB combined source, six files, bounded GitHub requests. No whole-repository indexing, robot deployment, executed build, automatic autonomous adapter generation, or automatic log/code matching. Existing route scaffold is still not calibrated robot-ready code. APK remains 2.3.0/code25; new web UI is not bundled there.

## Validation and regression controls
Actual catalogue handler tests cover active membership, unauthenticated rejection, permission denial with zero private network reads, fixed three-repository token use and no token response. Software Mentor tests cover exact commits, bounded context, excluded secrets/symlinks, private allowlist and line citations. Existing G3 Assist permission/budget suite passes with repeatable new migration. Windows sandbox blocked esbuild ancestor-directory access; same regression passed outside sandbox. TypeScript/build and live results recorded below when completed.

## Deployment and rollback
Use private_robot_access_20261004.sql (additive, rerunnable, preserves explicit role decisions), then bundled github-repositories and frc-assistant handlers. Deploy only reviewed changes through codex/knowledge-protection-release. Existing JWT gateway verification remains enabled. Roll back frontend/handlers independently; additive permission may remain. Disable private permission or revoke key to stop future private reads. Do not remove historical conversations or student records.

## Next work after connection
Repository-bound build/code-generation adapter and real robot/log acceptance remain distinct work. Do not repeat delivered Software Mentor, official ingestion, training, budgets or VR foundation. The old assumption that private source and all logs are unavailable is superseded by the identities and limited log evidence above.
