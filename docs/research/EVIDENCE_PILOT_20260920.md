# Isolated evidence collection pilot — measured results

20 September 2026. Research only. No production database, UI, application schema, deployed services or paid AI processing changed. All fetched content and generated records are local under `docs/research/evidence-pilot/`. No commit/push of downloaded third-party material performed.

## Collection

13 source requests: 12 extracted documents/pages, one restricted binder excluded. This is a deliberately small initial extraction/storage pilot, not a statistically representative sample of 300/500 teams per season. Six team pages were selected from known references, so availability is biased upward. It does not establish ten-year document counts.

- Six team-design/release pages: 179 (2017), 3476 (2019), 2767 (2023), 2910 and 6036 (2024), 695 (2025).
- Three FIRST game manuals: 2017, 2023, 2026; 135, 142 and 166 PDF pages respectively.
- Three current WPILib references: PID implementation, PID introduction, swerve kinematics. Stored with no robot season assignment; retrieval time records the current stable snapshot.
- Team 2910's linked Google Drive technical binder: publisher disallows download. HTTP 200 contained an error page. Excluded; no restriction bypass attempted. The release page remains available, but is not equivalent to the binder.

`manifest.json` records original/final URLs, source type, team/season where applicable, retrieval time, HTTP status, content type, ETag/Last-Modified where provided, file size and SHA-256. A retrieval timestamp is not a publication date. `extraction.json` records extraction results and the binder exclusion. `chunks.json` contains unreviewed passages with source identity, page/HTML locator, offset and text hash. These are experimental 2,000-character windows, not verified facts.

## Measured storage

| Measurement | Bytes | Decimal size |
|---|---:|---:|
| Accepted original files | 27,883,251 | 27.88 MB |
| Extracted text | 979,880 | 0.98 MB |
| PostgreSQL table storage, including stored search vectors/TOAST | 2,023,424 | 2.02 MB |
| Primary, source and full-text indexes | 671,744 | 0.67 MB |
| Total indexed relation storage | 2,695,168 | 2.70 MB |

726 unreviewed passages from 12 sources. Isolated in-memory PGlite PostgreSQL table with English generated tsvector, GIN search index, primary key and source index. Not the existing production schema. Measure with pg_table_size, pg_indexes_size and pg_total_relation_size. No replication of rows to simulate artificial scale.

Observed mean: approximately 3.71 KB per passage including these indexes. A mechanical extrapolation to 100,000 passages would be approximately 371 MB, but this is NOT a forecast for the final application. This small sample is dominated by manuals; production source/version/topic/review tables, embeddings if ever chosen, index growth, operational WAL, concurrency and free working space are not represented. The previously stated 0.5–1.5 GB planning range has not been validated for production and should not be replaced by this small-sample ratio.

Original file storage is measured separately. One binder/CAD/video can radically change that total. No projection from this sample to 300/500 teams is defensible until document availability and source-type distribution have been measured.

## Quality findings and spot checks

1. **Navigation contamination found and corrected for WPILib.** Initial whole-page extraction made PID match all three references. Restricting WPILib to its main article reduced PID matches from 23 passages across three sources to seven across the two actual PID references. Original measurement retained in `measurement-before-cleanup.json`. This demonstrates why raw HTML keyword counts are not evidence counts.
2. **HTTP status alone is insufficient.** Restricted binder returned 200 with permission-error text. Excluded from both the indexed corpus and accepted-file size. Download error response retained for audit only.
3. **Positive robot evidence:** Team 2767 opening release explicitly lists a carbon-fibre single-stage elevator and custom swerve. The 3476 retrospective's Elevator section describes the two-stage elevator and 60.8-inch travel. These source passages were inspected, but no new verified database facts were published.
4. **Negation matters:** Team 179 post 3 answers a turret question with a fixed-shooter description. A turret keyword hit must not become a positive turret classification.
5. **General examples are not robot evidence:** 2023 manual PDF page 74 contains a hypothetical gripper example explaining COTS versus fabricated items. Page rendered and visually checked (`review-page-74.png`). This is valid rules text, not evidence that a named robot has a gripper. Same example appears in other manuals and must retain season-specific citations without being counted as independent robot designs.
6. **Context matters:** PID documentation discusses turret rotation as a controller example/warning. It must remain general engineering guidance, not an attributed team mechanism claim.
7. **Plain words miss related terms:** exact full-text drivetrain query does not retrieve the swerve article. Synonym/topic hierarchy remains necessary. Deployment also appears in software/network contexts; a mechanism classifier cannot rely on that word alone.
8. **Remaining extraction limitations:** Chief Delphi pages retain surrounding text and replies; post-level author/locator isolation and pagination are not completed. Nine PDF pages yielded no text and remain unreviewed for possible image-only content. No OCR, diagrams/CAD interpretation, Hebrew retrieval evaluation or full document accuracy audit was performed. Character windows may split sentences or code. These constraints prevent automatic promotion to reviewed evidence.

No accuracy percentage is claimed from these qualitative spot checks. No verified facts were added by this pilot. Search timings on 726 rows are not production or large-corpus performance evidence.

## Next bounded research work

Continue source discovery beyond the six known releases, especially technical binders and less-documented teams. Build a source manifest divided into historical ranks 1–300, ranks 301–500 and unranked/missing-ranking seasons. Count actual accessible documents and exclusions before projecting either collection. Improve article/post locators and candidate claim handling in the research harness before any application implementation. Preserve official and general engineering references independently of the team cutoff.

The pilot proves that real sources can be collected and indexed locally with modest measured text storage. It does not establish the full corpus size or justify changing from 500 to 300. Production import remains a separate reviewable decision.

## Reproduction

- `node docs/research/fetch-evidence-pilot.mjs` fetches the 12 initial sources, replacing the local manifest. Do not rerun unnecessarily.
- `node docs/research/fetch-evidence-pilot.mjs --binder` attempts the additional linked binder. Do not repeat restricted downloads.
- Bundled Python: `docs/research/extract-evidence-pilot.py` extracts saved files without network access.
- `node docs/research/measure-evidence-pilot.mjs` creates an isolated in-memory database, measures it and closes it; it has no Supabase connection.
- Final machine-readable sizes and six topic probes: `evidence-pilot/measurement.json`.
