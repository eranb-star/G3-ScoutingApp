# Knowledge source checks — first local increment

Status: implemented locally, not deployed or committed. Production remains application 1326629. No new scheduler, paid AI execution, production DB mutations, Onshape/CAD changes or APK build. Preserve the two personal Android IDE files.

## User direction

Extend existing FRC knowledge and Evidence search. Support future seasons through configuration, admin Check now, clear progress/results, excellent desktop/mobile/RTL UX, and no known regressions. Five-minute polling was explicitly rejected. The broader knowledge phase is not complete.

## Delivered locally

- Existing Evidence search retains Reviewed evidence as its default. Official documents & updates is a view within that screen. Existing FRC knowledge gains a permission-aware link to it; articles, editing, saved answers and issue links remain in place.
- Configurable season registry and admin setup, including future years without invented game names or file URLs. Season defaults follow the calendar year when configured; historical evidence is retained.
- Admin-only Check now, shared active check per season, visible publication-page scope, progress, result counts and item notes. Resume after navigation/network interruption; stop; retry only failed items. No background completion guarantee: the open page advances bounded server requests, and unfinished work is durable for resumption.
- FIRST adapter checks configured official season-materials/playing-field pages. It discovers new same-season links, fingerprints PDFs and records other formats as skipped/link-only. It checks previously discovered PDFs as well as new listing links. No unbounded crawling, automatic scheduler or arbitrary-host fetch.
- Immutable document fingerprint history, last-check/change timestamps and paginated discovered-document cards. Source files open at FIRST. Existing evidence with a different fingerprint for the same source URL/season is retired from current search, with an audit event; claims and historical records are retained.
- Conditional document checks use ETag, or Last-Modified when available: a publisher 304 response avoids another PDF download and preserves the recorded size/hash/history. Redirects discard validators so another resource cannot inherit them. Up to 20 older discoveries rotate into each run; newly discovered and older unchecked listing links take priority within the remaining document budget. Caps produce attention status rather than a completeness claim.
- Effective admin plus evidence permission required by RPC and Edge handler, including active-member check. Worker-only mutations, leases, stale-worker rejection, per-operation permission checks and cancellation guards.
- Bounded requests: 80 document items/check; at most three items/advance request; maximum 24 MiB/PDF, 2 MiB/listing and 128 MiB/check; 18-second fetch timeout and at most three followed redirects, all checked against the allowlist. Oversize/failure/unsupported/season-not-published cases are visible. Failed downloads count streamed bytes toward the budget. Rapid repeated completed checks reuse the result for one minute.

## Source and content limits

FIRST's season page requests linking rather than rehosting. This increment stores discovery metadata and hashes only. PDF bytes are transient. It does not index full text, extract diagrams, import Q&A, automatically verify claims, or fetch CAD/video/external assets. Non-PDF same-season file links appear as attention items in the check report. Only fingerprinted PDFs become persistent document cards. Other hosts and publication structures need separately proven adapters. A future season with changed publisher paths may require adapting discovery; configuration does not guarantee unknown future formats.

The source check is not complete Phase 2: server-ranked corpus search, reviewed Gold Set, passage extraction under permitted source use, claim/article impact review, evergreen/vendor adapters, configurable scheduled checks and comprehensive historical coverage remain open.

## Verification

- Isolated PGlite and pure adapter tests: repeatable migration, role/direct-write/worker-RPC rejection, inactive account, revoked evidence grant, shared run, worker lease exclusion/expiry, stale-token rejection, cancellation/immediate restart, failed-only retries, source revision history, unchanged-response handling without new revisions/download bytes, stale evidence retirement without deletion, cross-season/URL/redirect/size/type guards.
- Actual Edge handler exercised with isolated publisher and caller/service doubles: authentication, admin gate, validated start, link discovery, duplicate lease, PDF fingerprint, terminal no-op, revoked access and fetch failure. No hosted Supabase runtime acceptance is claimed.
- One-off real publisher check: season page yielded 15 2026 document links (14 PDFs); field page yielded 28 links (14 PDFs); both yielded zero 2027 links. Current manual fetched: 5,057,812 bytes, valid PDF signature. No source documents persisted. Counts are observed on this date, not guaranteed ongoing coverage.
- Synthetic browser review: desktop Check now/completion and new-season setup; 390px Hebrew/RTL layout; member view excludes admin actions. Failure/recovery and library/evidence regression journeys are checked in the local preview before delivery.
- TypeScript and production Vite build checked locally; existing large-bundle warning remains. No physical-device acceptance or production rollout is implied.

Commands from apps/dashboard_web:

```
node scripts/test-knowledge-source-check.mjs ../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js
node scripts/test-knowledge-source-handler.mjs
node scripts/preview-knowledge-sources.mjs
node scripts/inspect-knowledge-publishers.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
```

Preview http://127.0.0.1:4224/?view=sources is synthetic only. Supports &he, &role=member, &failed, &unavailable and /library. Do not repeat the live publisher smoke check without a changed adapter or unresolved issue.

## Deployment prerequisites — not executed

Review UI and source limitations with the owner. Apply knowledge_source_checks_20260920.sql to synthetic QA; deploy the backend/supabase/functions/knowledge-source-check Edge function through the established deployment workflow, preserving JWT validation and service-only worker credentials. Verify hosted role/lease/source check behavior and migration fallback there. Production deployment requires owner approval and a recorded release identity. No credentials belong in the browser. Existing knowledge remains readable if new source-management tables are unavailable.


## Evidence search UI follow-up
Local only: aligned season/search filters; explicit All seasons scope; admin reference editor collapsed and labelled separately. Search still covers published claims on current source revisions, using keywords in titles and summaries. No historical robot/mechanism catalogue or semantic research is claimed. Empty results explicitly distinguish missing indexed evidence from absence of a mechanism. Source checks remain tied to an individual season.
Validation: TypeScript, isolated cross-season/publication/revision search tests and desktop browser review.
