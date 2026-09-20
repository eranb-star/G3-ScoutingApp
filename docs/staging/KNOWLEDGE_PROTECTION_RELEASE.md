# Knowledge protection release candidate

Baseline: 09f33b3 (includes the committed Attendance Center label awaiting deployment).
Scope: Admin/Mentor default G3 Assist permission and backend checks, permission-aware existing UI, caller-scoped article/issue retrieval, revision-specific article review with edit invalidation. Save failures remain visible in the article editor. No paid provider activation, budget coordinator, historical corpus import, source-center UI, or prototype is included.

Apply `g3_assist_permission_20260920.sql` and `knowledge_article_reviews_20260920.sql` before the updated backend/UI. First article migration clears old verified labels while retaining their legacy snapshots; article content remains. Backend denies access before checking for Gemini configuration, allowing no-key QA without spending. Permission checks still precede every provider attempt.

Validation: isolated candidate TypeScript and Vite build passed; existing large-chunk warnings remain. Actual SQL/article and actual-handler mock tests passed. Hosted QA SQL acceptance passed previously for both migrations; scripts are alongside this file. Updated handler still requires deployment/HTTP acceptance in QA and the release UI needs authenticated EN/HE/mobile acceptance. Test scripts require the established local PGlite dependency under docs/staging/ops-qa; it is intentionally not bundled. No production release has occurred.

Do not deploy the generated local dist directory: it is a compilation check without verified target environment configuration. Build separately with QA environment for acceptance and production environment for release. Existing Vercel QA overrides apply to codex/release-1-qa, not automatically to this new branch; configure/verify the target before pushing or deploying. Production needs a concrete release decision. Retain database/backend protections during UI rollback.
