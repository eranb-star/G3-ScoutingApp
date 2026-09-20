# Historical robot research — local implementation

User approved deterministic mechanism/topic search inside existing Evidence search, with minimal routine owner involvement. This is the first working increment, not completion of the historical catalogue or the whole design brief. Production deployment has not been authorized or performed. No paid AI, background polling, Onshape authentication or workshop hardware is needed for this increment.

## Implemented

- Existing route gains **Robots & mechanisms**. Existing reviewed references, source checks and knowledge articles remain available.
- 24 configurable mechanism/engineering-subject topics with English/Hebrew labels and synonyms. Admins add, edit or deactivate topics without a code release. Case-insensitive duplicate names are rejected. Topic type is immutable to avoid changing the meaning of existing confirmations.
- Deterministic server-side robot search, all/any multi-select, multiple/all seasons, keywords/team/name, explicit documented-absence filters, removable chips, reset, URL sharing, twelve results per page, coverage counts and comparison of up to three configurations.
- Same-configuration matching. Unknown is not confirmed absence. Contradictory current confirmations for one configuration/topic are excluded from robot results pending review.
- Existing reviewed-reference search also has confirmed-topic all/any filtering; a subject reference can be classified without a robot. This existing reference screen still loads its index in batches; migrating that older screen to server-ranked pagination remains open. The new robot search does not download the robot corpus.
- Admin source-reference entry, robot configuration registration, proposed/confirmed/rejected association queue, audit events and optimistic concurrency. Review requires the source season to match the configuration. A mechanism needs a robot; a general engineering subject does not.
- Saving a topic scans current published summaries. Saving/publishing a claim as an authorized administrator scans it against existing topics. Candidate detection is literal normalized word/phrase matching, including configured synonyms; it never confirms robot properties automatically. Explicit rescan is available, preserves decisions and creates no duplicate candidates for the same claim revision. Service-role/import pathways without a user context must explicitly schedule/run a reviewed scan; no durable background ingestion worker is claimed here.
- Claims are linked at an exact claim revision. A changed claim, conflicted/withdrawn claim or retired source stops satisfying searches. New revisions require review. Source web pages are linked, not copied or represented as immutable CAD snapshots.
- Existing evidence access grant and active-member requirement protect reads. Mutations require an active evidence administrator. Direct table writes are revoked. Delegated non-admin review permissions are not delivered in this increment.

## Real starter content and its limits

Canonical source manifest: `docs/research/robot-research-starter.json`; deterministic migration generator: `apps/dashboard_web/scripts/build-robot-research-seed.mjs`.

Six robot configurations / 21 concise evidence facts:

| Team | Season | Documented configuration / source |
|---|---|---|
| 179 | 2017 | Swamp Thing reveal; team explicitly describes a fixed shooter when asked about a turret |
| 3476 | 2019 | Cloudbreak designer retrospective; turret-mounted elevator, arm and cargo intake |
| 2767 | 2023 | Team CAD/code release; single-stage elevator, arm, swerve and vision |
| 2910 | 2024 | Typhoon release; turret/indexer and the team's climber reliability warning |
| 6036 | 2024 | Snoopy team discussion; turret motion limits |
| 695 | 2025 | Goldfish CAD release; elevator, climber, intake, indexer, arm and manufacturing |

Sources were read during this development session. These are link-backed research summaries, not physical validation, team certification or a claim that every design is advisable. Source URLs and locators are in the manifest. No fabricated teams or robots are seeded. No robot data yet for 2018, 2020–2022 or 2026 in this starter set. The proposed 50-record reviewed acceptance collection across 2017–2026 remains outstanding.

## Validation

- `node scripts/test-robot-research.mjs`: actual migrations applied twice and real seed applied twice in isolated PGlite. All/any, year, keywords/synonyms, explicit absence, same-configuration isolation, role/grant/inactive checks, blocked direct writes, topic/new-reference candidate scanning, duplicate scan prevention, review revision conflicts, claim revision invalidation and source retirement.
- Scale test: 1,100 synthetic configurations; counts and later pages cross the default REST row limit. Two paginated queries completed in approximately 0.5 seconds locally. This is not a hosted performance guarantee.
- TypeScript and production Vite build passed; existing bundle-size warnings remain.
- Browser checks cover mechanism all/any results, cited comparison, topic creation producing a candidate and review assignment. Hebrew mobile at 390px passed with no horizontal page overflow; inherited radio sizing was corrected. Member view hides admin tools. Existing all-season evidence search with Elevator topic returns three supporting references.
- Synthetic data mutations occur only in the isolated local preview database. Preview process restart resets that database. Real source links do not imply live Supabase connectivity.

## Install order when deployment is approved

1. Existing evidence/permission migrations already on the target.
2. `knowledge_source_checks_20260920.sql` (the earlier local increment; supplies admin helper).
3. `robot_research_20260920.sql`.
4. `robot_research_starter_20260920.sql` after review of the manifest.
5. Deploy the web bundle. Source-check Edge function deployment is separate and still requires its own configuration/acceptance.

All checks so far are local. Hosted authenticated/RLS acceptance and owner UI acceptance remain release gates. Do not deploy merely because the build passes. Preserve personal Android files and all wider Phase 0–7 acceptance work.

## Accepted design brief still to deliver

- Expand to the proposed 50 verified robot-season records, then measured 2017–2026 coverage. Never label finite public coverage complete for every robot.
- Controlled external source discovery/import, extraction, retry/cancellation/status and incremental source changes. Existing Check now fingerprints official PDFs; it does not ingest robot documentation or extract full text. No automatic internet search is triggered by adding a topic.
- Configurable topic hierarchy/subtypes and evidence-backed numeric specifications with units; contextual advanced filters for stages/travel/motor/material etc. These must not be guessed from summaries.
- Verified resource records and CAD/video/code/document filters with direct links and availability state.
- Topic merges/duplicate synonym governance, delegated review, saved-search account persistence and privacy-conscious aggregate search-gap reporting. Current shareable URL filters work without those services.
- Durable background scans and server-side ranked pagination for the older reviewed-reference index before substantial corpus growth.
- Independent reviewed evaluation set and hosted regression acceptance. No claim of zero regression risk; failed critical checks block release.

Continue within this approved direction without asking the owner to choose every category. Routine taxonomy/UX decisions are delegated; production deployment and any new paid execution remain separately gated.
