# FRC knowledge and Evidence search — agreed direction, proposed delivery contract

20 September 2026. User approved advancing Knowledge Intelligence, extending the two existing destinations rather than creating a replacement. User requires excellent UI/UX, regression prevention, all-season scalability and rapid incorporation of newly released knowledge. User subsequently approved implementing the admin Check now flow. No production deployment is authorized. This is the programme plan; see KNOWLEDGE_SOURCE_CHECKS_20260920.md for the first local increment and its precise limitations.

## Existing implementation inspected

- `FrcKnowledgeWorkspace.tsx`: shared `frc_knowledge_articles`, article reader/editing/admin deletion, saved community resources, official source links, Chief Delphi search. G3 Assist saves question/answer articles into this same library; robot issues link to articles.
- `KnowledgeEvidencePage.tsx` and `knowledgeEvidence.ts`: season-specific published/current claims, source revision/hash/locator, insufficient-evidence state, administrator curation with expected-revision checks. Season selector is hard-coded to 2017–2026. Collections are fetched and filtered in the browser.
- `knowledge_evidence_pilot_20260913.sql`: sources, claims and events; article-to-claim link, Hebrew text fields, full-text index, source retirement and curation RPCs. Reuse these identities and audit history. Later access-boundary migrations must be included when implementing or testing; the initial migration is not the entire permission contract.
- `chief-delphi-feed/index.ts`: live community search/RSS, not a continuously indexed corpus. Official source links in FRC knowledge are not equivalent to indexing their contents.
- Recorded evidence: 48 curated references, 19 for 2026. Not a completed rulebook corpus. Local inspection does not re-certify current production state or source freshness.

## Product boundaries

Keep FRC knowledge as the team learning/library destination: existing articles, saved answers, community material, official resources, and links to supporting evidence. Keep Evidence search as the place to inspect exact source passages, versions, authority and review status. Share source/revision identity and permission-aware retrieval; do not duplicate articles into a disconnected library or add a third chatbot.

Knowledge scope includes game rules and dimensions, programming/controls, mechanical/electrical/vision references, strategy, historical experience and team learning. Source type, season applicability, vendor/software version, authority, freshness and review status are separate fields. Evergreen technical material must not be assigned artificially to a single season. Community posts and saved AI answers remain synthesis/experience, not official authority.

## Delivery order

1. Season/source foundation: configurable season registry, active-season selection, source families and applicability; retain existing identifiers and citations. Add a synthetic future season without a frontend edit or annual SQL seed. Represent not-yet-published material honestly; never guess a future game's rules or dates.
2. Ingestion for bounded 2026 official sources: register discovery endpoints, detect new/changed documents, preserve immutable revision/hash and original locators, extract/index supported content, identify duplicates and store job outcomes. Start with official manual/updates/field documents; verify Q&A access before committing to unattended ingestion. Add other adapters progressively.
3. Search in the existing destinations: server-side permission-checked, ranked, paginated retrieval; exact rule/section search; Hebrew/English interface and evaluated retrieval; preserve original quotations and identify any translation. Keep cross-season results explicitly requested and labelled. Link an article to evidence without automatically endorsing it.
4. Continuous updates: scheduled checks and event-driven updates where the source supports them, retry/backoff, failed-job recovery, conditional downloads, administrator refresh, processing status and last successful check. No external scheduler is created as part of writing this plan.
5. Reviewed acceptance set and historical expansion: at least 25 initial 2026 questions with expected sources/locators, missing/conflicting/stale cases, then broader measured coverage. Import 2017–2025 through the same pipeline, with per-season manifests. A configured season is not a completed corpus.

## Freshness contract to measure

The user explicitly rejected five-minute polling because it would generate unnecessary requests. That proposal is withdrawn. Admin Check now is the approved first trigger: discover links on configured season publication pages, fetch changed/new supported material, and report gaps without claiming full coverage. New seasons are configured in data. Future automatic checks should be source-specific: a bounded kickoff/release check, roughly daily during the active season, weekly or paused outside it, and infrequent/on-demand for historical sources. These are future defaults to validate, not an installed scheduler. Processing begins promptly after discovery; universal immediate discovery is not promised. Record detection, processing and review separately.

First adapter feasibility finding: FIRST's season materials page requests links rather than rehosting (https://www.firstinspires.org/resources/library/frc/season-materials). The initial increment discovers links and fingerprints supported PDFs transiently; it stores document metadata and hashes, not the full documents or extracted text. Content indexing and reviewed-source expansion remain separate outstanding work subject to the source-use constraints. A successful Check now is not full-text ingestion or knowledge acceptance.

Incoming material becomes discoverable with its provenance and processing/review state; ingestion does not award a Verified badge. Scanned pages, diagrams and extraction failures remain visible as coverage gaps, not fabricated passages. No new paid OCR/model/provider execution before the existing governance checkpoint.

When a revision changes, retain old citations, flag affected derived claims/articles for recheck, and do not silently mark them current. Show the new original source while review is pending. Exact source passages and reviewed interpretations are distinct. Unknown impact stays explicit until resolved.

## Existing screen changes for review

- FRC knowledge: retain article library, reader, editing, admin deletion, source links and community search. Add configurable season/applicability filtering, new/updated material and evidence links; keep source classes clearly labelled. Preserve search/filter context when returning from a source.
- Evidence search: retain route and curation. Add season-driven source coverage, ranked paginated results with passage/locator/revision, separate source authority and review labels, revision history and clear superseded/conflicted states. Offer current-season results by default and explicit historical comparison.
- Administrator controls within the existing knowledge area: register source, enable/check adapter, inspect last success/failure, retry ingestion and review affected claims. Operational detail stays out of the student default view.
- Review layouts before implementation: desktop and narrow screens, Hebrew/RTL, keyboard and focus, loading/empty/error/retry states. Reuse the existing visual language rather than introduce a new branding system.

## Acceptance and regression gates

- Preserve existing article IDs/content, deep links, G3 Assist saves, issue links, editing/deletion permissions, source hashes, evidence events and curation concurrency protections.
- Check effective route/RLS/RPC and retrieval access, including revoked grants, inactive accounts and private material. New indexing must not widen visibility.
- Verify future-season configuration without code changes, evergreen content applicability, season isolation and original-source/version citations.
- Test changed-at-same-URL documents, duplicate fetches, out-of-order jobs, interrupted extraction, retry, unavailable sources and superseded evidence. Last good content remains accessible with honest freshness status.
- Test beyond API row limits and measure search/index performance on a documented dataset; do not rely on loading the corpus into the browser.
- Gold Set starts with 25 questions but expands to an explicit coverage matrix, named reviewer and recorded unresolved gaps. Passing 25 questions is not comprehensive acceptance.
- Validate no-result versus backend-failure states, mobile/RTL, keyboard navigation and readable citations. No known critical UX failures or regressions may ship.
- Reuse completed evidence. Run relevant checks for actual changes and repeat only after changes, failures or unresolved gaps. No production-content mutations as tests.
- Implementation, automated checks, reviewer acceptance and deployment remain separately reported. Owner approval precedes deployment. Preserve the two personal Android IDE changes.

## Estimate and open decisions

The prior 5–8 engineering-day estimate covered a bounded 2026 improvement, not continuous multi-source, all-season ingestion. Provisional expanded foundation estimate: 3–5 engineering weeks, excluding reviewer waits, full historical content review, source access delays and paid-service work. Re-estimate after proving the first official-document adapter. Source permissions, supported formats, rate limits, hosting/worker capacity and acceptable freshness need validation before committing to operating targets. This scope does not require CAD access or workshop equipment.
