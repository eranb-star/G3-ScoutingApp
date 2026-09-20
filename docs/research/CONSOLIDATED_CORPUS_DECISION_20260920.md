# Consolidated 300 versus 500 evidence-collection decision

20 September 2026. Latest research checkpoint. Read alongside the original capacity snapshot, historical ranking limitations and first extraction pilot. No production data, application/UI code, configuration, paid processing or deployment changed.

## Decision

Retain 500 teams per season as the coverage target, load the top 300 first, and add ranks 301–500 in measured batches. The expanded sample provides no storage justification for excluding the extra 200 teams. Store searchable text/citations in PostgreSQL, retain selected documents separately, and initially link to CAD/video rather than copying those assets. Do not equate a ranking list with an available engineering corpus.

This is a decision based on measured source sizes and explicit sensitivity scenarios, not an exact ten-year document census. Statistical confidence intervals or population coverage claims would be inappropriate for this purposive sample.

## New measured collection

Discovery sources:
- 2022 community-maintained directory post: https://www.chiefdelphi.com/t/the-open-alliance-is-officially-open-to-all-teams/397951/21
- 2023 curated highlights: https://www.chiefdelphi.com/t/the-open-alliance-2023-highlights/421994

48 distinct team-season build-thread links identified. Matching to the saved historical Statbotics snapshot produced 24 top-300 threads, 11 additional ranks-301–500 threads and 13 not matched to the top 500. The last category is not proof of a specific lower rank. The 2023 highlights are editorial selections, not a complete directory. The directories do not enumerate all sources available for these teams.

All 35 matched threads were fetched through public topic/post endpoints: 35 initial requests plus 150 bounded continuation requests. All advertised public post IDs were retrieved; no hidden/deleted posts or access restrictions bypassed. 3,338 posts total. Images, linked documents and video content are not included in thread text completeness. No repeated monitoring installed.

| Observed sample | Top 300 | Ranks 301–500 | Combined |
|---|---:|---:|---:|
| Complete public threads retrieved | 24 | 11 | 35 |
| Posts | 2,925 | 413 | 3,338 |
| Unreviewed text passages | 3,632 | 698 | 4,330 |
| Extracted text bytes | 2,731,759 | 851,536 | 3,583,295 |
| Indexed relation bytes | 8,536,064 | 2,637,824 | 11,173,888 |
| Indexed MB per thread (mean) | 0.356 | 0.240 | — |
| Text KB per thread (median) | 90.5 | 89.5 | — |
| Text KB range per thread | 10.1–325.0 | 10.0–120.9 | — |

Decimal MB/GB throughout. PostgreSQL sizes measured with PGlite pg_table_size/pg_indexes_size/pg_total_relation_size, separately per group. Tables include text, team/year, precise post URL/id/date/author, status, hash, stored English tsvector, GIN index and team-season index. They are isolated experimental tables, not the full production schema. Post windows are at most 2,000 characters and remain unreviewed. Quotes and routine replies are retained for this conservative text-volume measurement. A post may mention prototypes, other teams or later changes, so thread membership alone does not establish robot facts.

6,901 distinct linked URLs discovered across the 35 threads. These include images, videos, vendor pages, quoted links and other discussions. They are NOT 6,901 documents, have NOT all been fetched, and must not be added to the evidence count. Exact passage hash duplicates also remain in the thread-size measurement (3,605/3,632 distinct top-300 passages; 688/698 additional-band passages). Deduplication must preserve separate source occurrences.

## Actual engineering value beyond rank 300

The additional band contains real technical content, not only metadata. For example, Team 4099's 2022 post 16 describes debugging steering PID behavior on MK4i modules: https://www.chiefdelphi.com/t/frc-4099-the-falcons-2022-build-blog/398376/16 . This was inspected in the fetched post. It is a useful controls troubleshooting source, not a blanket validation of the robot design.

Keyword probes in the additional band found PID in 10 of 11 threads and swerve in nine. These are retrieval checks, not verified mechanism prevalence. A 3506 post mentioning elevators refers to inspiration from earlier seasons, illustrating why automatic positive mechanism labels would be wrong.

## Separate real technical-binder measurement

Team 1757 2023 binder, from https://whsrobotics.org/2023techbinder.pdf :
- Original file: 2,333,297 bytes (2.33 MB).
- 189 physical PDF pages; extracted content repeats in seven 27-page blocks.
- Raw extraction: 238 passages, 268,863 text bytes.
- Exact text deduplication: 34 distinct passages, 38,409 text bytes, with all page occurrences retained.
- Experimental indexed binder relation: 270,336 bytes (0.27 MB), including page arrays and search index. Small-table fixed overhead makes this a poor linear estimator.

Page 12 was rendered and visually inspected; the swerve module table and surrounding text correspond to extracted content. Text equality is not proof of equal diagrams. Original PDF remains intact; deduplication applies only to searchable text. Blank/image-only pages are not considered fully evaluated. This one binder cannot establish average binder size across the population.

## What it implies for 300 versus 500

The following is a **one-comparable-thread-per-team-season scenario**, applying observed mean indexed bytes separately to each ranking band:

- 300 × 10 × (8,536,064 / 24) = **1.067 GB**.
- Additional 200 × 10 × (2,637,824 / 11) = **0.480 GB**.
- Combined 500-per-season scenario = **1.547 GB**.

Nominal passage counts at the observed means are 454,000 versus approximately 580,909. These are unreviewed text windows, not confirmed facts. Ten seasons are used for planning arithmetic only: the unranked 2021 season requires a separate inclusion policy, and recent ranking snapshots remain unavailable from the previously inspected archive. Multiple threads/documents per team may increase volume; undocumented teams reduce it. This sample is biased toward publicly documented teams and spans only 2022–2023. No extrapolation can establish an exact 2017–2026 total from it.

Sensitivity scenarios below are **explicit multipliers**, not statistical confidence bounds. They illustrate additional source text/index footprint relative to the measured thread baseline. They do not measure production overhead or claim two/four documents per team.

| Scenario | 300 per season | 500 per season |
|---|---:|---:|
| Observed thread-equivalent baseline | 1.07 GB | 1.55 GB |
| Twice that footprint | 2.13 GB | 3.09 GB |
| Four times that footprint | 4.27 GB | 6.19 GB |

Add the existing disk usage (previously inspected at 0.34 GB), shared engineering references, production review/version tables and operational headroom. Original PDFs/CAD/video belong to separate file-storage accounting. The high 500-team scenario approaches the 8 GB allocation once other requirements are included, whereas the baseline and doubled scenarios leave substantial nominal headroom. This is a planning conclusion, not performance certification or a guarantee that all future content fits.

For file storage only: if every selected team-season had exactly one PDF the size of the inspected binder, 3,000 PDFs would be 7.0 GB and 5,000 PDFs 11.7 GB. These are arithmetic examples, not forecasts of PDF availability or average size. Copying CAD/video can overwhelm such a model; retaining source links avoids that unbounded initial commitment.

## Gaps and concrete treatment

| Gap | Treatment before production ingestion |
|---|---|
| Unknown count/type of all public documents | Grow publisher/source manifest; measure each actual import batch. Do not promise an exact global internet census. |
| Only two seasons sampled here | Expand checks to older/recent seasons and non-Open-Alliance publishers as collection grows; keep forecast provisional. |
| Missing reliable recent rankings and 2021 exception | Obtain dated trustworthy exports; retain unranked sources explicitly; include 2021 by documented design availability rather than invented EPA. |
| Prototypes, negation, quoted other-team facts | Keep source passages searchable but unreviewed; promote robot facts only with attributable evidence and configuration/date context. |
| Repeated pages and cross-source duplication | Store unique text with all citation occurrences; keep original versions and files. |
| HTML/forum paging and permission-error responses | Fetch documented post IDs, verify completeness, validate content type/body, and record restricted/unavailable sources. |
| Missing visual information | Do not infer diagram/CAD facts from text extraction. Link to originals; review images separately when needed. |
| Production schema/performance untested at scale | Stage the real schema and benchmark incremental corpus before release. Local passage-table size is not a latency guarantee. |

## Proposed operating bounds, not changes applied

Retain 500 as scope; prioritize 300 first. After each bounded batch, measure total disk, source bytes, indexed bytes, search behavior and errors. Set a pre-import review threshold around **5 GB total database disk used** on the current 8 GB allocation, leaving roughly 3 GB operational/growth margin. This is a proposed conservative checkpoint, not a Supabase rule or a guarantee. At that checkpoint decide deduplication/retention or deliberate capacity expansion; do not silently drop evidence or disable the spend cap. No threshold/monitor/upgrade has been configured.

Specific team requests and exceptional documentation remain eligible outside the cutoff. Official manuals and evergreen controls knowledge remain independent. Keep user-facing search deterministic; no LLM API was used in this research.

## Audit artifacts

`expanded-study/inventory.json`: discovered team-season URLs and ranking bands.
`expanded-study/thread-manifest.json`: metadata, original response hashes, advertised post counts.
`expanded-study/post-fetch-ledger.json`: continuation request outcomes.
`expanded-study/complete-*.json`: full retrieved public post sets.
`expanded-study/extraction.json`: per-thread counts, text sizes and links.
`expanded-study/passages.json`: unreviewed text with post-level provenance.
`expanded-study/measurement.json`: measured indexed sizes and retrieval probes.
`expanded-study/binder-manifest.json`, `binder-passages.json`, `binder-deduplicated.json`: binder provenance and extraction.

Research scripts are isolated: expanded-source-study.mjs, extract-expanded-study.py and measure-expanded-study.mjs. No production connection. No raw documents committed/pushed. This report supersedes the earlier manual-dominated sample as the primary team-thread storage comparison, while retaining its limitations.
