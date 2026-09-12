# Release 1 production rollout — 2026-09-13

User authorized the complete production rollout and one APK after Student and Mentor acceptance and Admin review.

## Production web and database

- Latest available scheduled backup confirmed: 2026-09-12 01:15:59 UTC. This is a daily recovery point, not a just-before-release snapshot.
- Applied all six reviewed migrations in one transaction to `hnqwhuuxlqfyawqymaaz`: evidence, requirements, results, change impact, configurations, consensus. SQL editor confirmed commit.
- Final inspection caught an undefined `p_reviewers` audit reference in the single-reviewer configuration function. Corrected to `p_reviewer`; added and passed a regression for primary reviewer reassignment after the consensus migration. Production metadata confirms the correction.
- Production purchasing settings singleton exists; no production seed repair was necessary.
- Release source: `321ccc4764029aa92eaa9c7971030a7a3dc258bc` on `codex/release-1-qa`.
- Vercel created a **fresh production-environment build**, not a direct alias of the QA bundle: `C6wLiAH8eTjyuji3rt9UEyknn4HU`, Ready, assigned to `g3-6740.com`.
- Immutable deployment: https://g3-scouting-app-5qpe-j57a3baqh-eranbos-projects.vercel.app
- Live HTTP check: 200; served bundle contains production Supabase reference and no isolated QA reference. Production login screen loaded normally.
- Authenticated production Home/Projects check pending user sign-in at time of writing.

## Android

- Version 2.1.8, code 22; uses bundled production assets (no remote server URL).
- TypeScript and production Vite build passed; existing large-bundle warning remains.
- Signed release build passed; Crashlytics mapping upload succeeded. APK signature verified (v2, existing G3 certificate), package `com.g3.scouting`, version 2.1.8 / 22. Packaged JavaScript confirmed production database and no QA database reference.
- Artifact: `releases/G3-Team-Hub-2.1.8.apk`, 4,688,104 bytes. SHA-256: `7721b28b143dd9a92358cb1682ab9ff8bdf8c417844ad39789a729d9d5d65ed1`.
- Physical installation and phone acceptance cannot be claimed until performed.

## Boundaries

- The QA preview stays isolated; its synthetic users and data were not copied into production.
- QA account switching was not configured in the isolated environment and was not part of this acceptance.
- Existing Android `.idea` user modifications remain uncommitted.
- This is Release 1 of the V5.2 plan, not completion of the whole blueprint.
- Prior web deployment for rollback: `CUKpN9E8LnkZFMbUYvLC2QL9dmPR`. Older client RPC compatibility is retained; do not blindly reverse migrations or restore the daily backup, which could lose newer team data.
