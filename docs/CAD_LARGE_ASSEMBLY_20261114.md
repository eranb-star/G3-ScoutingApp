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

Backend bundle deployed through Supabase dashboard; web release and real assembly acceptance are IN PROGRESS. No migration or permission expansion. APK not rebuilt; installed older APK retains legacy whole-assembly request behavior until updated. Do not mark end-to-end completion until real import and production website are verified.
