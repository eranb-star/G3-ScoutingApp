# Knowledge protection and assistant controls — production release

Deployed 2026-09-20 following the user's explicit production authorization. This checkpoint supersedes earlier candidate-only / production-unchanged statements.

- Source: `34d77417654a56e094abbdca6812cd059d129089`, pushed branch `codex/knowledge-protection-release`.
- Isolated checkout: `docs/staging/knowledge-release.local`. Unfinished historical/source-search work and personal Android files excluded.
- Vercel project: `eranbos-projects/g3-scouting-app-5qpe`.
- Production deployment: `Fkf9mQhNCKAsmMbwPCDwqfsa9Xcp`, Ready, 29-second fresh production rebuild; https://g3-6740.com assigned.
- Production Supabase: `hnqwhuuxlqfyawqymaaz`.
- Seven migrations applied: assistant permission, article reviews, budget, budget admin, executions, spending guards, result privacy (all dated 20260920).
- Existing `frc-assistant` updated with bundled committed handler. Reloaded deployed editor contents matched the source exactly after newline normalization.
- Server `G3_ASSIST_EXECUTION_MODE` and Production web `VITE_G3_ASSIST_EXECUTION_MODE`: `budgeted-text-v1`.

## Verified

Production SQL confirms Admin/Mentor allowed, Member/Team Leader denied; policy disabled and activation unapproved; monthly cap $25, team/day $3, member/day $1, purpose/month $5, execution $1.60, four dispatches/minute. Zero provider attempts at postmigration inspection. One article revision preserved. All seven new assistant/review tables have RLS enabled.

Production website returns HTTP 200 and renders sign-in. Served assets target production Supabase, not QA. The built assistant includes request recovery/cancellation and text-only notice; image upload is absent. Admin budget-status controls are present in the main bundle. Unauthenticated production Edge POST returns 401 with “Sign in is required.”

Earlier candidate TypeScript/build, article regression, actual-handler mocks, budget/controls/PGlite tests, hosted SQL/RLS tests and real Admin QA authentication passed. These are distinct from production signed-in acceptance. User deferred Mentor/Student sign-in tests and production signed-in acceptance; those are **not marked passed**. No paid provider call or billing change was performed.

## Operational state and remaining work

Controls and article protections are live. AI generation is paused for all roles until a separately approved paid pilot enables activation. Ordinary authorized knowledge search and saved history remain separate. This release does not deploy the historical corpus/search programme.

Next: user's signed-in production acceptance; then verify intended provider key/project and approve a bounded paid pilot before enabling billing/activation. No claim of completed paid end-to-end acceptance or zero regression guarantee.

For rollback, retain database/backend protections and disabled policy; do not restore an unmetered assistant path. Use this production build as the release reference; main working tree still contains unfinished work.
