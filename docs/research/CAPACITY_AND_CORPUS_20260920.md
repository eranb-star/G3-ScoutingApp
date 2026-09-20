# Evidence corpus and Supabase capacity research

Checked 20 September 2026. Research only: no application implementation, production import, configuration change or deployment in this assessment.

## Measured public inventories

Ten official FIRST allteams pages were fetched sequentially. Unique team-number links were deduplicated within each year. These are directory entries, not verified physical robots or engineering evidence. Exact IDs, HTTP status, response hashes and retrieval time are saved in `frc-team-directory-census-20260920.json`; reproducible collector: `count-public-frc-sources.mjs`.

| Season | Team-season directory entries | Unique archive URLs within season |
|---|---:|---:|
| 2017 | 3,372 | 25 |
| 2018 | 3,663 | 28 |
| 2019 | 3,808 | 23 |
| 2020 | 3,927 | 38 |
| 2021 | 3,076 | 28 |
| 2022 | 3,206 | 71 |
| 2023 | 3,354 | 35 |
| 2024 | 3,528 | 43 |
| 2025 | 3,736 | 40 |
| 2026 | 3,787 | 53 |

Total: **35,457 team-season entries**, **6,312 distinct team numbers**. Directory membership does not establish attendance, a completed robot, public documentation or a particular mechanism. Multiple robot revisions can exist per team-season. These counts should not be substituted for FIRST's registered-team statistics, which use a different definition.

Source pattern: https://frc-events.firstinspires.org/2017/allteams through https://frc-events.firstinspires.org/2026/allteams.

FIRST archive: **380 distinct URLs across 2017–2026**, after deduplication across years; 384 summed within-year unique URLs. Includes manuals, ZIPs, CAD, videos and other linked resources. This is the top-level archive inventory, not all documents inside ZIPs, all revisions or all linked-site content. Targets have not all been validated or downloaded. Source: https://www.firstinspires.org/resources/library/frc/archived-games . The saved HTML snapshot is `archive-inspection.html`; per-year URL/label inventory is `document-source-census-20260920.json`.

WPILib current main repository: **333 `.rst`/`.md` files under source**, of which **270 are under source/docs and are not index files**. Complete, non-truncated GitHub tree at commit `1897febd8ae910a6e0de78388f62e7ccd6d8a085`. This is a current repository snapshot, NOT ten historical versions or 270 verified technical articles; it also includes support/contributor/beta documentation. Relevant paths include PID, profiled PID, swerve kinematics and drivetrain simulation. Inventory in the same JSON. Source: https://github.com/wpilibsuite/wpilib-docs . Collector: `count-document-sources.mjs`; archive year extraction used each `<details id="YEAR">` block and deduplicated hrefs.

The Blue Alliance insights lists **139,278 matches for 2017–2026**: 15,442; 16,930; 18,035; 4,634; 0; 14,675; 16,342; 16,981; 17,867; 18,372 respectively. Underlying insights timestamp July 9, 2026, so not a complete September offseason census. These are match records, not engineering documents or mechanism facts. Source: https://www.thebluealliance.com/insights . Do not combine these counts into a misleading evidence total.

## What remains uncounted

No exact global count is established for public team build logs, Chief Delphi posts, CAD projects, repositories, videos/transcripts or vendor references. Search result counts and category counts cannot establish a complete decade census. Private/inaccessible/deleted sources cannot be treated as available. Existing search taxonomy does not create source evidence.

A defensible evidence count requires a defined source manifest, allowed access, deduplicated document versions, extraction rules and review. One document can yield zero, one or many relevant passages; one claim can have multiple citations. Store source, version, passage and robot fact as distinct entities. Count reviewed claims separately from discovered documents and unreviewed candidates.

## Live Supabase snapshot

Read from authenticated production dashboard for `hnqwhuuxlqfyawqymaaz`, organisation `brmroverrzjspqefkxos`.

| Item | Observed |
|---|---|
| Organisation | Pro |
| Provisioned disk | 8 GB |
| Total disk used | 0.34 GB, approximately 4% |
| Database component | 52.6 MB |
| WAL | 128 MB |
| System component | 168.4 MB |
| Infrastructure compute selector | Nano, t4g.nano, up to 0.5 GB RAM |
| Offered upgrade | Micro, 1 GB RAM, labelled Free Upgrade |
| Spend cap | Enabled; infrastructure UI says disk limited to 8 GB |
| Project-filtered storage usage summary | 0.002 GB (billing usage metric, not an independent bucket-byte audit) |
| Project uncached / cached egress in cycle | 0.111 / 0.008 GB |

Cycle: September 12–October 12, 2026. Usage reports can lag. Usage page labels compute accounting as Micro Compute Hours whereas infrastructure selector reports Nano; use infrastructure capacity, and verify this discrepancy before any compute change. Pro includes 100 GB object storage at organisation level; other projects share that allowance. Organisation-wide aggregate usage was not audited. Pricing: https://supabase.com/pricing . Disk accounting: https://supabase.com/docs/guides/platform/database-size . No upgrade or spend-cap change applied.

## Capacity interpretation and recommendation

100,000 is not a meaningful completeness target or a reason by itself to change database provider. Design for growth beyond it and measure actual indexed bytes and query performance before setting resource requirements.

Illustrative planning arithmetic ONLY, assuming 5–15 KB of database footprint per searchable text record including its allocated index/metadata overhead:

| Searchable records | Illustrative incremental disk |
|---|---|
| 100,000 | 0.5–1.5 GB |
| 500,000 | 2.5–7.5 GB |
| 1,000,000 | 5–15 GB |

These are not measurements or capacity promises. Excludes original PDFs/CAD/video, embeddings, extra history, WAL peaks and working space. Full-text indexes, topic joins and real document lengths need measurement in a representative isolated pilot. Large objects belong in object storage when retention/licensing allows; videos can remain cited at their original source with timestamps. Neither files nor all result rows should be transferred to the browser for each search.

Recommended next research/design gate, before implementation:
1. Define the initial source manifest: FIRST 2017–2026 archive, versioned WPILib controls documentation, then specific team technical publications and permitted community sources. Enumerate additional sources by publisher and season, with duplicate and unavailable counts.
2. Use the 35,457 team-season entries as the coverage denominator, marking documentation missing explicitly. Never infer a mechanism from team presence or absence of results.
3. Assess a representative document sample across PID, drivetrain, gripper, deployment, elevator and turret topics. Record text yield, useful claim yield, extraction failures, review effort and permissions. Report extrapolations separately from actual inventories.
4. Finalize the existing Evidence search expansion: default All seasons, selectable years and evergreen material, topic hierarchy/synonyms (drivetrain includes swerve), deterministic full-text search, source/date filters and visible evidence/coverage status. Source-text matches must remain distinguishable from reviewed robot facts.
5. Before bulk ingestion, benchmark representative indexed data at 100k and 500k rows in isolated QA, check English/Hebrew/mobile UX and existing knowledge/search/admin permissions, and decide compute from measured latency/concurrency. Evaluate the offered Nano-to-Micro upgrade separately; no infrastructure change authorized by this report.

Priority is useful, cited topic coverage rather than maximizing row count. The corpus can legitimately grow past 100k evidence passages, but the research has not established 100k existing reviewed engineering facts. Comprehensive internet-wide coverage cannot be guaranteed.
