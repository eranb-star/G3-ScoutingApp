# Large assembly import — 14 November 2026

## Incident evidence
User supplied “This response exceeds the CAD review limit.” Production onshape-connector logs show POST413 at 15:09:19, 15:14:40 and 15:14:56; latest request a7e0d720-1d85-4dcf-a392-066788c1fa39 took 15321 ms. No 504 in the inspected hour. Existing provider reader imposes 4,000,000 bytes on all endpoints, including surface geometry. Snapshot f1d24115-9936-4416-9f73-af8ea0ca0ea4 (chassis offseason Assembly 1) already contains 34 parts and 102 occurrences in 98,335 bytes, so its assembly structure itself is below that limit. Exact failed part still requires production reproduction; do not invent its identity.

## Focused implementation
- Endpoint-specific bounded reads: 32 MB per part surface response, 16 MB assembly structure, existing 4 MB for other endpoints. Read-only provider/redirect/token rules unchanged. Sanitized endpoint-class limit diagnostics.
- Opt-in chunked assembly protocol: plan from the authorized immutable snapshot, one distinct part per request, two client workers, visible completed/total progress. Same part/configuration reused for repeated placements. No client-supplied provider URLs or cache identities.
- Completed per-part geometry saved privately and immutably; retries reuse it. Final compatibility asset created only when all parts are ready, never overwrites existing v3 geometry. BOM imports, inventory, tasks and saved Studio scenes are not rewritten.
- Shared loader used by Studio imports, CAD Mentor and pinned Robot Build part inspection. Old published-library assets remain supported. Existing completed assets short-circuit the chunk protocol.
- Explicit interactive bounds remain: 500 distinct parts, 1,000 occurrences, 1.8 million coordinates per part, 30 MB finalized compatibility asset. This is not an unlimited CAD engine; no silent omitted geometry or substituted revision.

## Verification / delivery
Focused large-assembly test passed: 70 distinct parts / 71 occurrences, failed-chunk retry, immutable prior assets, no incomplete finalization, exact snapshot/config identities, response budget separation and client reconstruction. Existing provider security, connector handler, team access and geometry/review tests passed. TypeScript passed. Required CI unchanged, new focused test added.

Backend bundle deployed through Supabase dashboard. Source 3bae7d6 / release 95fe2de; CI406/407 passed; preview 85iDswwzCFS19RKZtph4sjFDHxki Ready. Production promotion is waiting on the user's Vercel identity verification; real assembly acceptance is IN PROGRESS. No migration or permission expansion. APK not rebuilt; installed older APK retains legacy whole-assembly request behavior until updated. Do not mark end-to-end completion until real import and production website are verified.

Live legacy-client attempt with chassis offseason reproduced a second failure after the response-size correction: HTTP546 / “CPU Time exceeded”, request b841cee3-a748-49df-99ba-b505694cd360 at 15:32:23. This verifies why a larger response cap alone is insufficient; the new website's chunked path still needs live acceptance. Test draft b5ab8328-5a45-405d-8648-aba4228fc5cb remains unsaved; no existing scene modified.

Pre-acceptance preservation baseline from read-only SQL: robot_studio_scenes 4 rows, full-row hash 92b9bb1871e8a74fa7d0024aa9803b68; robot_build_bom_lines 2 rows, full-row hash 26dcaab4259ed20b6b17e9ae49aed63f. Compare after acceptance (account for any concurrent real user changes explicitly).

## Live acceptance follow-up
User completed Vercel verification. Production95fe2de deployed as GBcepegKuFKAFSgif56uf9zHWk2k, then final allocation guards41f6beb as BKaspEpSip2yJzAtgPsLbATbwdBn (Ready15:55:42 Israel); CI408/409 passed. Fresh production tab confirms index-4fHrA0lk.js. Legacy cached tab/new network failures must not be counted as acceptance. New protocol has persisted all31 distinct placed chassis part chunks (0–30) privately; the assembly has102 occurrences. Existing database rows remain untouched by these attempts.

Additional completion fix: assemblies whose repeated geometry expands beyond25MB use an explicit shared-meshes-v1 representation in the new immutable geometry asset; positions stored once and exact transforms preserved. Small/previous assets retain the original shape. Updated web loaders normalize both forms, including published-library reads. Focused test verifies20 repeated dense meshes fit under2MB rather than exceeding30MB, sharing the same decoded positions and rejecting invalid references. Old APKs do not support this new compact format; use updated web until a new APK release. Structured action/part diagnostics contain no tokens or source geometry. Final compact-format web/backend deployment and successful visible import are still pending at this entry.
