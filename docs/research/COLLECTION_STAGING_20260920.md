# Collection continuation and isolated corpus checkpoint

20 September 2026. User approved proceeding with the collection approach. This increment expands and validates local collection; no application/UI, Supabase, deployment, infrastructure, paid AI or scheduled monitoring changed. Top-500 coverage target retained; this checkpoint is not completion of that target.

## Actual collection

Existing full-thread material is reused without re-downloading. Post-level link discovery produced **6,898 unique normalized URLs** (the prior raw-string count was 6,901; HTML entity decoding and URL normalization consolidate three entries). The inventory records each citing team, season, rank band, post URL/id and timestamp independently of the linked document's publisher and season.

Heuristic URL categories: 22 PDF, 160 CAD, 883 video, 2,084 image, 287 code/documentation and 3,462 other. These are URL classifications, not validated document types or record counts. Most linked assets have not been fetched.

Nine selected engineering PDF URLs were attempted, with a 25 MB per-file limit and resumable manifest. Six valid PDFs downloaded, totalling **3,733,765 bytes**; three returned 404. Initial sandbox-denied attempts are retained separately in the request manifest and do not count as publisher failures. No repeated polling, permission bypass or automatic retries of 404s.

Downloaded:
- Team 2877 vision-processing, camera-latency and test-bench whitepapers.
- Team 230's 2016 catapult design paper, cited by Team 6328 in 2022. Older than the core ten-season range; retained as a separately labelled engineering reference.
- WCP Elevator Block drawing, a vendor reference, not evidence of a particular robot's mechanism.
- Team 449's November 2022 second-order swerve kinematics paper, cited by Team 4481 in 2023. General engineering, not a 4481 robot fact.

Unavailable at observed URLs: MK Battery ES17-12 data sheet, Team 33 battery-cart instructions, Team Rembrandts TR-X notebook. URLs and HTTP outcomes remain in the inventory. No claim that replacement URLs do not exist.

Publisher/title metadata was checked against cover/title text. The Team 449 first page was rendered and visually inspected. Source-level attribution decisions are in `linked-document-attribution.json`; they do not verify all technical assertions.

## Quality gate

Six PDFs contain 55 physical pages. The first extractor produced invalid control characters, including apparent equation/ligature corruption. A second independent extractor (pdfplumber/pdfminer) also failed the character check on the affected material; its outputs are retained. **37 pages remain quarantined**, excluded from searchable text. The original PDFs, page locators and reason remain available. One entire three-page swerve paper therefore has a source record but no indexed passages yet.

The other 18 pages produced 23 unreviewed passages. A page passing the character check is not mathematically verified. Drawing dimensions and equations still require visual/context review. Original bytes are not altered and corrupted glyphs are not silently replaced with guesses. Resolving these pages requires font-aware extraction or OCR with equation-aware visual verification; none was claimed completed.

## Combined isolated corpus

Built offline from existing thread/pilot data, the previous 1757 binder and new PDF passages. Local bundle: `isolated-corpus/bundle.json`.

| Metric | Actual |
|---|---:|
| Source versions retained | 54 |
| Sources with extracted searchable text | 53 |
| Distinct passage bodies | 5,075 |
| Citation occurrences | 5,317 |
| Repeated occurrences sharing an existing text body | 242 |
| Passage table and indexes | 13,041,664 bytes |
| Citation table and indexes | 2,293,760 bytes |
| Source table and indexes | 114,688 bytes |
| Total indexed relations | **15,450,112 bytes (15.45 MB)** |
| Verified robot facts newly published | **0** |
| Production writes | **0** |

This measurement includes source/version records and separate citation rows, unlike the earlier flat-table experiment. Exact-body hashes deduplicate searchable text while retaining all page/post citations. It does not identify paraphrase duplicates or automatically merge claims. The in-memory PGlite test database is closed after measurement; the local JSON bundle preserves the reproducible corpus. It is not a live Supabase import and is not visible in the existing application.

Validation: all source records unreviewed; all citation links resolve to stored sources/text; duplicate text retains citation occurrences; final passage bodies contain no prohibited control characters. Database foreign keys and uniqueness constraints enforce referential integrity. Source URLs and version hashes are stored independently; citing-team metadata is not substituted for document authorship. No confidence/accuracy percentage or large-scale latency claim.

## Implication for the agreed approach

Keep the 500-team target and priority order. This measured batch still provides no reason to reduce to 300. The important new issue is extraction correctness and source attribution, not disk exhaustion. The 15.45 MB total is a measurement of this bounded corpus, not a replacement ten-year forecast; the consolidated comparison's explicit scenarios remain provisional.

Collection remains incomplete: only 35 ranked full build threads from two seasons, six earlier team pages, manuals/general references and selected PDFs have been collected. Missing recent ranking snapshots, wider seasonal/publisher coverage, remaining linked-document discovery and image/equation extraction are explicit gaps. This is not a claim to have 300 or 500 teams per season ready for students.

Before application integration: use an explicit boundary between searchable unreviewed source text and confirmed robot facts; carry publisher/citing-team/season distinctions and quarantines into the review flow; validate permission, English/Hebrew, mobile and current search behavior. Production import/deployment still requires a concrete reviewed release.

## Local artifacts and repeatability

- `collect-linked-documents.mjs`: generates link inventory with citation occurrences, fetches only the selected PDF allowlist, validates PDF signature, caps downloads, caches source outcomes, saves hashes.
- `extract-linked-documents.py`: page extraction, control-character quarantine, provenance.
- `build-isolated-corpus.mjs`: offline normalized corpus build and indexed relation measurement, with no network or credentials.
- `linked-documents/manifest.json`, `extraction.json`, `quarantine.json`, `inventory.json`: auditable source and extraction records.
- `isolated-corpus/measurement.json`: final measured numbers.

Downloaded/generated corpus directories are now Git-ignored to prevent accidental publishing of third-party source caches. Files remain local and have not been deleted. Research code, reports and attribution decisions remain reviewable. No commit or push performed.
