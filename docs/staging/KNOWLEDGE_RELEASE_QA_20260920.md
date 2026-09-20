# Knowledge protection release — hosted QA checkpoint

**Latest controls continuation:** [Implemented controls and hosted QA evidence](../G3_ASSIST_CONTROLS_20260920.md). Admin spending UI, semantic-purpose gate and durable request recovery/cancellation are implemented locally. Three control migrations and rollback-only acceptance passed in isolated QA; policy remains disabled at $25. No production deployment, billing change or paid call. This checkpoint supersedes older pending-implementation wording below; remaining release gates are explicit in the linked document.


User authorized moving ahead with release preparation. This checkpoint is not production deployment or paid activation approval.

## Hosted changes and evidence

Applied the assistant access and article review migrations to **G3 Release QA**, project `cyooubycafubbnkjcqlw`, organization G3 Isolated QA. Production `hnqwhuuxlqfyawqymaaz` and the real-data recovery clone were not modified. The SQL Editor auto-saved a private query in QA.

Before application, the existing article table and five synthetic QA members were present; neither new audit/review table nor either permission existed. After application, the assistant grants were Admin/Mentor true and Member/Team Leader false.

Executed [assistant acceptance](knowledge-access-acceptance.sql) with authenticated database role and synthetic JWT subject: four role defaults, permission revocation, inactive account denial, audit attribution, admin-only audit visibility and denied audit forgery **passed**. Synthetic role/grant changes rolled back.

Executed [article acceptance](knowledge-review-acceptance.sql) with authenticated database role and synthetic subjects: draft creation, direct verification denial, Member review denial, attributed Mentor review, author edit invalidation, immutable snapshots and stale-review rejection **passed**. Synthetic article/review rows rolled back. First attempt encountered `Failed to fetch (api.supabase.com)`; the bounded retry passed. Dashboard initially displayed Unhealthy although database queries worked; do not treat this as infrastructure health acceptance.

These are hosted SQL/RLS tests, not browser Auth, PostgREST or deployed Edge-function acceptance. Earlier local actual-handler/provider-mock tests and browser fixtures remain separate evidence. No Gemini request or billing change occurred.

## Release contents and order

1. Assistant permission migration and article review migration.
2. `frc-assistant` permission enforcement and caller-scoped article/issue retrieval.
3. Assistant permission hook and launch/composer restrictions; knowledge article revision/review controls; existing permission catalogue integration.

Prepare a selective release from the current committed baseline. The working tree also contains unfinished source discovery/historical search integration, prototype scripts and personal Android files. Do not deploy the whole working tree. In particular, `FrcKnowledgeWorkspace.tsx` mixes article protection changes with a source-center entry link/style dependency; separate these for the protection release.

Production order is SQL → backend permission gate → freshly built production-configured UI. Existing legacy verification labels will be retained in historical snapshots but cleared for explicit re-review. Content remains. Preserve database and backend protections if the UI must be rolled back. Never promote the QA-configured Vercel artifact into production.

## Remaining release gates

- Selective release artifact prepared locally: **1bf299b**, branch `codex/knowledge-protection-release`, checkout `docs/staging/knowledge-release.local`. TypeScript, Vite build and actual-handler/article tests passed; existing chunk warnings remain. The source-center link/style dependency was excluded and editor save errors made visible inside its dialog. No push or deployment. Release manifest: `docs/staging/KNOWLEDGE_PROTECTION_RELEASE.md` in that checkout. The local compiled output does not have verified target environment configuration and must not be deployed directly. Existing QA-only Vercel overrides belong to `codex/release-1-qa`; configure the isolated branch before any remote build.
- Deploy/test actual Edge handler in QA without a paid provider request; authenticated denied requests and allowed-role validation. The QA schema setup did not include Edge functions or provider secrets. Updated handler now checks identity/permission before Gemini configuration; local tests prove no-key denied callers get 403, allowed empty requests 400 and allowed valid requests PROVIDER_NOT_CONFIGURED/503 without context reads or provider calls.
- Real authenticated browser acceptance of the release build, including English/Hebrew, permission management, article editing/review errors, mobile layout, saved history and ordinary search. Synthetic account credentials are not retained in repository; a credential reset, if necessary, is a user handoff.
- Inspect production-specific grants and legacy verified count immediately before production migration; confirm release decision against the concrete tested artifact.

## Billing decision

The user's screenshot is the Gemini API Billing setup page. Setup belongs to the intended project **G3-6740-AI** (`gen-lang-client-0196794219`). Its relationship to the deployed API key has not been proven; do not infer that from the project name.

Do not complete billing yet. If the existing production API key belongs to that project, activating billing can make current traffic billable immediately. First ship/verify the role gate, then implement and test the agreed server-side monetary limits and purpose controls, and agree a bounded paid pilot. The execution contract is still a specification, not active spending protection. No need to wait for the entire knowledge programme before a controlled paid pilot, but access control alone is insufficient to claim the approved budget/purpose controls are operational.

Official billing reference: https://ai.google.dev/gemini-api/docs/billing
