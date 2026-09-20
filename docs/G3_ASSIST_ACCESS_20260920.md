# G3 Assist paid-access permission — first Stage 1 increment

Status: implemented locally and tested, not deployed. User authorized implementation with “good lets start.” Production deployment, provider billing changes and paid requests remain outside this increment.

## Changes

- Additive `backend/supabase/g3_assist_permission_20260920.sql` registers `use_g3_assist` in the existing Roles & permissions catalogue. Initial grants: Admin/Mentor true, Team Leader/Member false. Rerunning preserves later administrator decisions. A protected audit table records subsequent grant changes; authenticated clients cannot write it.
- Existing permissions matrix displays the bilingual capability without a duplicate role-management screen. Existing administrator-only write policy remains authoritative.
- Actual `frc-assistant` Edge handler checks the caller's `has_permission` before request parsing/context/history writes, and again before each provider attempt/fallback. Permission failures deny access; lookup failures fail closed. Inactive-member and conversation ownership checks remain.
- `useG3AssistAccess` checks server permissions without optimistic role fallback. Identity changes immediately deny stale grants; failed lookups deny; focus/visibility and existing permission-change events refresh access. Backend checks protect against changes made elsewhere even before the UI refreshes.
- Global assistant launch and web popup are gated; issue-context launch is disabled; direct assistant routes keep owned history readable but disable paid composer, images and suggestions. English/Hebrew access explanation points to administrator-managed permissions.

## Validation

- `node scripts/test-g3-assist-access.mjs`: passed against real SQL in isolated PGlite and the transpiled actual Edge handler. Covers four role defaults, explicit grants/revocation, inactive members, rerun preservation, audit read/write isolation, direct text/history/image/issue requests denied before context/provider work, lookup failure, and revocation between provider attempts. Provider calls mocked; no paid requests.
- `node node_modules/typescript/bin/tsc -b`: passed.
- `node node_modules/vite/bin/vite.js build`: passed; existing large-chunk warnings remain.
- Isolated actual-component browser preview at port 4226: Member composer/image/send disabled; Mentor composer enabled; default permission matrix aligned and correct; Hebrew denied state present. This is synthetic UI QA, not live role or physical Android acceptance.

## Release sequence and limits

When deployment is approved: apply additive SQL, verify production role grants/RLS/audit, deploy backend gate, then deploy UI. Check both positive roles and denied direct API requests with authorized QA accounts. An older frontend cannot bypass the deployed backend gate. Missing migration fails closed. Do not roll back the backend protection independently while leaving the system described as restricted.

An already issued provider request can finish and incur cost after revocation; future attempts are rechecked. In-flight cancellation and atomic budgets are still pending. Existing retry count and model selection are otherwise unchanged. This increment does not implement relevance classification, paid provider activation, article review revisions or shared historical retrieval.

Next Stage 1 work: article verification protection/review contracts, connected Search → Ask → Test → Save screen previews, purpose/budget execution contracts and their tests. Do not claim the whole Stage 1 or full connected-knowledge programme is complete. Preserve earlier uncommitted feature work and personal Android configuration.
