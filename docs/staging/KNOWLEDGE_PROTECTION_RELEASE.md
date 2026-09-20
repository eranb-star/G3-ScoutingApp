# Knowledge protection release candidate

## Controls extension, 20 September

Candidate now includes disabled-by-default spending ledger, admin budget panel, opt-in text purpose/answer coordinator, durable recovery/cancellation, daily/member/purpose limits, provider pacing/cooldown and deleted-conversation result protection. Historical-source UI/corpus and personal Android changes remain excluded. Localized limit errors distinguish daily, monthly, relevance-check and cooldown failures.

After the two original permission/article migrations, apply in order: `g3_assist_budget_20260920.sql`, `g3_assist_budget_admin_20260920.sql`, `g3_assist_executions_20260920.sql`, `g3_assist_spending_guards_20260920.sql`, `g3_assist_result_privacy_20260920.sql`. Existing status RPC reads added policy columns dynamically. No paid activation is included. Server and UI pilot flags must be coordinated before enabling the text-only path; legacy behavior remains default and does not enforce these monetary controls.

Hosted QA has these migrations and the earlier bundled handler; current localized error-message change is not yet hosted. Real Admin browser-to-Edge permission/no-provider checks passed. User explicitly deferred Mentor/Student real sign-in acceptance to later production testing; record as **deferred, not passed**, and retain deny-path automated tests. The full application UI has not completed authenticated acceptance. Paid model accuracy/usage compatibility, unresolved-cost reconciliation, tighter holds and provider-account pacing still require acceptance before activation. This candidate is suitable for review and disabled QA rollout, not a claim of paid production readiness.

The paragraphs below describe the original protection-only candidate and are historical where superseded here.

Baseline: 09f33b3 (includes the committed Attendance Center label awaiting deployment).
Scope: Admin/Mentor default G3 Assist permission and backend checks, permission-aware existing UI, caller-scoped article/issue retrieval, revision-specific article review with edit invalidation. Save failures remain visible in the article editor. No paid provider activation, budget coordinator, historical corpus import, source-center UI, or prototype is included.

Apply `g3_assist_permission_20260920.sql` and `knowledge_article_reviews_20260920.sql` before the updated backend/UI. First article migration clears old verified labels while retaining their legacy snapshots; article content remains. Backend denies access before checking for Gemini configuration, allowing no-key QA without spending. Permission checks still precede every provider attempt.

Validation: isolated candidate TypeScript and Vite build passed; existing large-chunk warnings remain. Actual SQL/article and actual-handler mock tests passed. Hosted QA SQL acceptance passed previously for both migrations; scripts are alongside this file. Updated handler still requires deployment/HTTP acceptance in QA and the release UI needs authenticated EN/HE/mobile acceptance. Test scripts require the established local PGlite dependency under docs/staging/ops-qa; it is intentionally not bundled. No production release has occurred.

Do not deploy the generated local dist directory: it is a compilation check without verified target environment configuration. Build separately with QA environment for acceptance and production environment for release. Existing Vercel QA overrides apply to codex/release-1-qa, not automatically to this new branch; configure/verify the target before pushing or deploying. Production needs a concrete release decision. Retain database/backend protections during UI rollback.
