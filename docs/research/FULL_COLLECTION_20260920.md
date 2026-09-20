# Full historical source collection — completed discovered queue

The user explicitly authorized proceeding to the 500-team target, not another sample-only decision. This supersedes earlier research-only wording for the local collector, isolated index and review interface. Production import/deployment remains separate and has not occurred. No paid model, scheduler, Supabase upgrade or production data change.

## What is working

- Resumable collection for the selected archived top 500 in 2017–2020 and 2022–2023: 3,000 team-season targets. Top 300 precede ranks 301–500. A team appearing in multiple years has multiple entries.
- The initial 590 discovered threads completed successfully. After tighter title parsing, their candidate associations cover 492 selected team-seasons; 2,508 still have no source discovered through these catalogues. Download completion does **not** mean complete top-500 documentation coverage.
- Public Open Alliance catalogue enumerated to its end. Robot Showcase scanned beyond the 2017 activity boundary. No assertion that these two catalogues exhaust the internet. Topic titles only nominate team/season associations; they do not verify who built a described mechanism.
- 2021 uses documentation-based inclusion. 2024–2026 are collected into a **ranking pending** pool, using team numbers present in the saved official FIRST season directories. These sources are not misrepresented as a top-500 selection.
- Expanded queue: 1,423 distinct public threads, candidate associations for 1,283 team-seasons across the ten seasons. 791 are supplemental/unranked; 492 match archived ranked selections. Multi-team/multi-year titles require review.
- Public post IDs are fetched in bounded batches, with cached responses, checkpoints, one collector lock and at least 1.1 seconds between new requests. Access/rate-limit/server errors stop the run; missing sources are recorded. No hidden-content access or automatic retry loop.
- Offline HTML parsing decodes entities, keeps exact post URL/id/author/date/offset, and quarantines invalid characters. Global exact-text deduplication retains every citation. Linked PDFs, images, CAD and videos are not considered extracted merely because a post links to them.
- Deterministic keyword and multi-select topic-mention search in a local review interface. Uses the **existing** 24-topic catalogue and its synonyms, including admin-created topics; no reimport or LLM is needed for a new topic to match already indexed text. All/any applies within each passage. This is separate from the existing confirmed robot-feature filters.
- English/Hebrew UI, all/individual source seasons, paginated citations, explicit unreviewed status, coverage table and manual progress refresh. Search loads a newly completed index on the next search. It does not poll publishers.
- The saved WPILib inventory also supplies 270 non-index RST/Markdown documents at pinned commit `1897febd8ae910a6e0de78388f62e7ccd6d8a085`. A separate finite collector caches these files; the corpus builder imports completed files with SHA-256 and exact GitHub line citations. Technical, beta and contributor scope is recorded separately. This is one pinned documentation revision, not ten historical software versions; linked includes/images/code files are not expanded automatically.

## Run and review

Local review: `http://127.0.0.1:4225/collection` (`?he` for Hebrew). It is a developer/local review extension of the existing preview, **not a deployed team-facing feature**. The original preview on 4224 is separate. Restarting the preview resets its synthetic admin/topic fixture; downloaded corpus files persist.

`node docs/research/run-full-collection.mjs` is a **finite** pipeline: queue → collect → extract → index/measure → report. It resumes cached work and automatically builds the final searchable snapshot. No scheduled recurrence. Check `full-collection/run-state.json` and `collector.lock` before starting another run. `completed-discovered-queue` means the discovered queue finished, not that every selected team has documentation.

The Python path defaults to the installed Codex bundled runtime; override with `G3_RESEARCH_PYTHON` when running elsewhere. The local PostgreSQL/PGlite dependency is the existing `docs/staging/ops-qa` runtime. Neither is a production deployment dependency.

For a deliberate offline snapshot while collection is still running:

1. Run `extract-full-collection.py` with the installed Python runtime.
2. Run `node docs/research/build-isolated-corpus.mjs`.
3. Run `node docs/research/build-collection-report.mjs`.

Do not run two builders simultaneously. Source/topic checkpoints and finished index publication are atomic. A failed/incomplete source is excluded from the completed-source index; downloaded data remains available for diagnosis/resume.

## Measurements and acceptance

Final run completed at **16:29:45 UTC on 20 September 2026**. All **1,423 queued threads** completed, containing **40,546 public posts**. All **270 WPILib files** completed separately. No pending/partial/blocked thread jobs remain in this discovered queue. The complete source catalogue is still an ongoing programme, not an exhaustive internet collection.

Combined measured index: **1,716 source versions, 48,797 unique text passages, 50,157 citation occurrences, 121,544,704 bytes (121.5 MB)** including indexes. This is **100,670 rows across the three experimental tables**, not 100,670 independent facts or robots. It includes the previously collected manuals, controls references and PDFs. The 1,360 duplicate passage occurrences retain their separate citations. No new verified robot facts were created.

Final candidate source coverage by season: 2017 **58**, 2018 **49**, 2019 **98**, 2020 **70**, 2021 **37**, 2022 **87**, 2023 **130**, 2024 **281**, 2025 **255**, 2026 **218** team-seasons. Total **1,283**: **492** match the six archived top-500 selections, **791** are supplemental/unranked/ranking-pending. These remain title-based discovery associations, not verified robot attributions. **2,508 of the 3,000 ranked target entries still lack a discovered source** in these catalogues.

Download integrity passed for all 1,423 threads and 40,546 posts. The collector ledger contains 2,974 successful public requests with **zero duplicate successful fetches**, including directory discovery and post continuations; this excludes the separate WPILib/past pilot requests. Exact source versions and citation-resolution checks passed. The collector is no longer running; the local review server remains available.

Use `collection-progress-20260920.json` for the latest generated summary; the pipeline updates it when finished. Full per-target coverage lives in the Git-ignored `full-collection/coverage.json`. `isolated-corpus/measurement.json` records table/index sizes and invariants. These are measured local relation sizes, not a forecast or a hosted performance guarantee; original files, WAL, backups and production review tables are separate.

WPILib main-branch documents are labelled as development snapshots (or beta/contributor documents), with pinned GitHub line citations. They are not presented as the installed/stable WPILib version for every team. Keyword results are ranked by PostgreSQL full-text relevance with a stable citation-ID tie-break. Source-type filtering separates official references, team/community material and other references.

Passed checks:

- Existing robot-research regression suite: permissions, revoked/inactive users, same-configuration matching, all/any/year/absence, source retirement, review conflicts, repeatable migrations/seeds and >1,000-row pagination.
- Review endpoint contract: real results for PID/elevator/turret/drivetrain/gripper; citation URLs; non-overlapping pages; season restriction; empty results; SQL-like input; invalid filters/methods; all/any topic semantics; claw→Gripper synonym; new admin topic searches existing text immediately, then deactivation removes it.
- Strict TypeScript check of the review component; source-title edge cases including a team whose number looks like a season.
- Full-download integrity: unique jobs, selected ranking consistency, no fabricated supplemental ranks, all advertised public post IDs accounted for, and successful requests reused without duplicate fetches. Checked again by every corpus build.
- Desktop browser and 390px Hebrew/RTL review; topic selectors accessible, no page-wide horizontal overflow. Final queue completion and hosted acceptance remain distinct checks.

Final full-corpus endpoint suite passed against the 16:29 UTC index (1,716 source versions). Literal keyword probes returned **805 PID**, **3,150 elevator**, **1,527 turret**, **1,624 drivetrain** and **390 gripper** passage citations. These are retrieval observations, not counts of robots or validated mechanisms. Official/team filters, dynamic new-topic matching/deactivation, pagination, invalid inputs and season restrictions passed on this final index. Browser verification shows the completed queue, zero remaining threads, final PID results and development-documentation labels. Hebrew 390px viewport remains free of page-wide horizontal overflow.

## Remaining gaps and concrete treatment

1. **Recent rankings:** current Statbotics reads previously returned server errors. The provider has an [open outage report](https://github.com/avgupta456/statbotics/issues/414); this corroborates the failure but is not proof of present service status. Keep useful recent documents searchable with ranking pending. Reconcile a dated, reliable ranking export when available; do not substitute an invented rank or use older-year ranks as current-year ranks.
2. **2,508 selected team-seasons with no discovered source:** the generated coverage ledger lists each. Next discovery adapters should target official team release sites, public technical binders and public code/CAD release directories. Absence from two forum catalogues is not proof that documentation does not exist.
3. **Attribution and quality:** review passages against the original post/page before promoting them through the existing robot-configuration/evidence review flow. A thread can discuss other teams, prototypes, abandoned designs and negations. No new verified robot facts were created by this bulk run.
4. **Linked assets and corrupt PDF pages:** inventory and validate selected engineering documents independently. Preserve the previously quarantined 37 PDF pages; do not silently replace corrupted text. Source links do not establish CAD/diagram/video understanding.
5. **Production integration:** apply corpus permissions/versioning in the existing Evidence search, validate hosted performance and authenticated access, then obtain release approval. The local unreviewed corpus is not seeded automatically into production or made into confirmed claims.

Keep the 500 target. The measured text index does not justify reducing to 300 at this point. Source discovery and accurate attribution remain the limiting factors. Preserve all other project work and the personal Android IDE changes.


## Existing-screen integration correction

The user correctly reported that PID still showed zero in the existing Robots & mechanisms screen. Collection had been exposed only through the separate local review page; the original port 4224 preview still searched six starter reviewed configurations.

The existing `KnowledgeEvidencePage` / `RobotResearch` now accepts a source-search service. The local preview supplies the isolated collection adapter and defaults to Source passages. The same topic IDs, synonyms, all/any choice, keyword query and multiple selected seasons drive source search. Reviewed robot configurations retain their distinct count, evidence semantics and comparison flow. Source pagination resets on filter changes. Documented absence never becomes a negative text search: the source view directs users to reviewed configurations or to clear that filter. Unknown/unavailable service results are not represented as zero matches.

Browser acceptance on port 4224: PID & controls gives **906 source-passage citations** across all source years, while the reviewed configuration count remains **0** for that topic. PID with 2017 and 2018 selected gives **19**; selecting years excludes unassigned general engineering references, explicitly explained in the UI. Literal keyword PID remains **805**. Switching result type, source pagination, filter resets and absence handling passed. The endpoint suite now also checks multi-season union, legacy single-season equivalence, future-season empty results and invalid multi-year input. TypeScript project check and Vite production build passed (existing large-chunk advisories only). Hebrew RTL/mobile checked at 390px without page-wide overflow; selected-button hover contrast corrected.

This is **local integration, not production readiness or deployment**. The service is injected by the preview host; no localhost endpoint is bundled as the production data source. A production authenticated corpus service, permissions, import and release acceptance remain outstanding. No new confirmed robot facts, collection runs, paid AI calls or production writes were made for this correction.
