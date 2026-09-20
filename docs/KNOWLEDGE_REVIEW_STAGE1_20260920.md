# Stage 1 continuation — article trust and workflow preview

Local implementation only; no production deployment or paid calls.

Implemented `knowledge_article_reviews_20260920.sql`: dedicated `review_frc_knowledge` permission (Admin/Mentor initially), immutable content snapshots, review events, reviewer attribution, content/source edits invalidate verification, and revision-checked reviewer RPC. Normal REST clients cannot update verification/review metadata even with a reviewer grant. Original ownership edit/delete rules remain; inactive authors cannot edit. Legacy verification labels are preserved in legacy snapshots but cleared for re-review on first application. Rerunning does not undo a legitimate later review. Permanent deletion cascades to revision/review rows; archives hide them through RLS.

Existing team-library reader now displays revision/review state and the permitted Verify/Withdraw controls. Verification asks the reviewer to confirm checking the article and supporting sources. Saves carry a revision condition to avoid overwriting a concurrently changed article. Assistant article/issue retrieval now uses caller-scoped queries, not privileged service reads. Shared relevance ranking still belongs to the next retrieval increment.

Validation: isolated SQL tests cover forged verification, initial/legacy history, mentor review, changes after verification, stale reviewer rejection, revoked permission, rerun preservation, inactive-author denial and archived-history isolation. TypeScript passed. Production build passed with existing large-chunk warnings. Real-component synthetic browser flow verified Revision 1 Reviewed → edit → Revision 2 Awaiting review. Test fixtures do not replace hosted role acceptance.

Review-only connected workflow: `apps/dashboard_web/scripts/ConnectedKnowledgeReview.tsx`, served at `/flow` by `preview-article-review.mjs` on port 4227. Demonstrates query/context selection, permission-aware Ask, answer structure, test outcome and draft saving. Clearly labelled sample content; no real AI, source search or database save. This is an English interaction prototype; production EN/HE/RTL and mobile acceptance remain required. The actual article reader is available at `/?article=example`; `&role=member` hides review controls, `&he` localizes it.

[Execution contract](G3_ASSIST_EXECUTION_CONTRACT_20260920.md) fixes purpose decisions, request states/idempotency, atomic monetary reservation semantics, provider pacing, uncertain-charge reconciliation, cancellation, allowed tools and tests. It is not yet the implemented budget/classification service. No paid activation is ready.

Release dependency: deploy the article SQL before the updated library UI (which selects `revision`); review exact legacy reset effects in staging before production approval. Preserve verification protections during UI rollback. In production acceptance inspect actual grants, including column grants, before enabling review controls. No production migration has been applied.

Remaining: review/refine connected workflow into production components, implement shared retrieval/ingestion, implement the execution contract and provider evaluation, then hosted regression/load/restore acceptance. Stage 1 foundations and contracts are delivered locally; this is not the completed connected-knowledge programme or a certified release.
