# Phase 2 — 3D Robot Studio implementation and release

User authorized end-to-end implementation. The approved scope is ROBOT_BUILD_PHASE2_3D_DESIGN_20261010.md. This record separates deployed software, production acceptance and physical/device evidence.

## Latest checkpoint — 11 October 2026

Phase 2 is deployed on g3-6740.com. Initial production release 51f17ad (development 8bd8da8), Vercel 9oMCw9wqyQhM8sb5sQAytiPFSyDX, Ready at 00:57:23 GMT+3. Final release **f7472a3** (development **a405261**) is Ready Production on **g3-6740.com**, Vercel **5bYQjpVGWhLJFeNb6iFCdM1taiJa**, at **01:11:47 GMT+3, 11 October 2026**, including fullscreen/reload continuity refinements.

### Delivered journeys
- Robot Build → 3D Robot Studio; independent private concepts need no existing robot project.
- Real attributed chassis/components, exact connected Onshape snapshots, private GLB/STL imports, eight dimensioned stock families and editable hopper example.
- Placement/rotation, numeric phone controls, hierarchy, mounting frames, alignment, source-component extraction, saved-assembly reuse, independent duplicates and alternatives.
- Known-mass coverage, bounded approximate geometry screening, review notes, source update/replacement, immutable versions, comments, access-controlled sharing and editing leases.
- Comparison, named presentation views, limited/coupled joint demonstrations, exploded views, cutaways and attributed image export.
- Reviewed instance-to-build proposals, existing-requirement matching, optional assembly placement, duplicate protection, approved-candidate reconciliation and normal project CAD follow-up tasks with exact source-version links.

### Verified evidence
- All 72 required CI scripts passed locally, TypeScript and production Vite build passed. Remote implementation CI355/356 and correction CI358 passed. Fullscreen CI359/360 passed. Final release CI361 passed (1m59s).
- Five additive migrations committed in production after a successful rollback rehearsal. Production returned nine Studio tables, all RLS enabled. Private CAD publication remains empty unless its owner explicitly grants it; no access was expanded for testing.
- Real private acceptance design: `99331628-4881-4339-89e2-dd881e48eb9a`, named **Phase 2 acceptance · mixed-source robot concept**. Published 6328 Darwin drivebase, four generated hopper panels and G3 `rake · Assembly 1` imported together. Rake source `9dd70a9a-ead8-4904-92e0-7fc5610773dd`, snapshot `11146054-e189-4932-9547-41a7c761b307`; envelope shown as 600 × 23.2 × 179.8 mm. Chassis envelope 711.2 × 685.8 × 156.5 mm. These are imported geometry dimensions, not physical measurements.
- Cloud save/reopen retained both alternatives, edited positions, 550 mm copied bottom-panel width and presentation step. Comparison identified the single changed component. Original alternative retained its 500 mm width. Demonstration density explicitly labelled as an assumption produced 1.44 kg versus 1.58 kg known subtotal; five other masses stayed unknown.
- Production joint controls exercised illustrative 0–45° rake motion and return-to-design pose. No physical joint correctness claimed. Geometry screening returned panel surface contacts and explicitly reported partial/budget-limited coverage.
- Build UI loaded actual offseason requirements without error; opening before selecting a project now remains valid. Production transaction used the existing authenticated scene owner and real target build, proposed the saved hopper, accepted twice, asserted exactly one new requirement/mapping and then ROLLED BACK. No test manufacturing/demand records remain.
- Actual production reload exposed a temporary stale editing lease; final refinement preserves this tab's client on reload while new/duplicated navigation gets a fresh client. TypeScript passed. Final production acceptance established a lease on the new release, reloaded the page, and confirmed Saved version 11 with New alternative still enabled immediately.
- Local EN/HE 390 px iframe controls and dimension editing passed. Fullscreen refinement measured model and controls inside the viewport with no horizontal overflow. Final production fullscreen also verified its controls within the 720 px viewport. These are browser-layout checks, not physical Samsung performance evidence.

### Boundaries that remain explicit
The starter catalogue is not every FRC part or a manufacturer-certified library. Missing battery/controller models use import. Mesh screening is bounded and approximate; no full robot clearance, strength, torque, dynamics, CAM, manufacturability or physical compatibility certification is claimed. No centre-of-mass number is fabricated without centroid data. The 500-instance desktop / 150-instance mobile performance targets are not measured device claims. Physical dimensions, real-device performance and the uncoached student/workshop pilot still need observations. No new APK, robot deployment, paid recovery project or GitHub write permission was introduced.

Production screenshot: [mixed-source presentation](staging/robot-studio-phase2-production-20261011.jpg). The acceptance concept remains private for the owner to inspect; it is illustrative, not an approved robot design.

Team workflow: [3D Robot Studio guide](ROBOT_STUDIO_TEAM_GUIDE_20261011.md). Frontend rollback baseline: Phase 1 deployment `2r4UPurQxeHhZw4E2q9sy29YThaL`; additive Studio data can remain while investigating a frontend rollback.

The chronological notes below are historical. This checkpoint supersedes their earlier undeployed/unfinished status.

## Implemented locally so far
- Lazy-loaded `/robot-build/studio`, direct Robot Build menu entry and existing build shortcut.
- Scene/alternative domain, valid stock primitives, exact units, hierarchy/reparenting, immutable-copy alternatives, mass coverage and resize invalidation.
- Three.js editor with move/rotate handles, numeric placement, grouping, donor CAD library, GLB/STL and exact Onshape snapshot imports.
- Existing MIT-attributed 6328 export reused, checksum-pinned nodes: real drivebase, Kraken X60/X44 representations, hex bearing, SDS wheel and VH-109 radio. These are team-export models, not manufacturer-certified dimensions. Browser rendered the drivebase in the editor.
- Private cloud scene/version migration, CAS saves/idempotency, editor lease, explicit sharing, private uploads. Autosave, session draft metadata recovery and navigation guard are under browser validation.
- Empty-by-default team CAD snapshot publication with connection-owner grant and revocation. No real snapshot has been published by the agent.
- Basic checks plus bounded worker-based surface-contact/bounds screening. Results invalidate when the layout changes; no clearance certification.
- Limited joint demonstration, saved cameras, compare, screenshot/presentation controls; still needs complete interaction acceptance.
- Build proposals call existing manual-requirement RPC; exact version, leader permission, stable instance mapping and repeat protection. Changed adopted definitions are blocked for existing build review; no automatic executed-record rewrite.
- Inventory reference UI and immutable review-comment migration/components added, not yet fully accepted.

## Evidence actually run
- `test-robot-studio.mjs`: dimensions, hollow volume, unknown-mass coverage, alternative independence, cyclic hierarchy rejection, world-pose preservation, Onshape row-major transforms, eight stock families, STL unit scaling, invalid GLB rejection.
- `test-robot-studio-storage.mjs`: migration repeat, real PostgreSQL RLS, member inactivity, immutable versions, request retry, stale save, viewer/editor separation, lease exclusion, private CAD denial.
- `test-robot-studio-proposals.mjs`: actual existing requirement RPC in fixture, immutable provenance, repeated apply/proposal no duplicate demand, stale design and unauthorized adoption blocked.
- `test-robot-studio-cad-library.mjs`: default no access, owner-only publication, exact object download policy, student scene composition and revocation. Fixed ambiguous `name` reference in storage policy; rerun passed.
- TypeScript passed at several integration points; latest edits must receive final type/build checks.
- Read-only production schema preflight verified CAD/build dependency columns and no existing studio tables. No production migrations applied.

## Still required before claiming complete
Reconcile every acceptance row against implementation; finish source update/replacement, attachment/selection details, assembly-level proposal mapping/change handling, presentation/recovery/access expiry, comments/inventory validation, and any design features still absent. Run realistic mixed scene (published chassis + own CAD + generated hopper/tubes), independent student permissions, save/reopen, undo/delete, mobile/RTL and representative performance. Do not infer these passed from domain tests or a chassis screenshot.

Complete additive-schema rehearsal, focused affected build/CAD checks, required CI, release worktree reconciliation, production migration/deployment and actual production acceptance. Update this record and CURRENT_CHECKPOINT only with established evidence. Physical engineering validation remains separate.

## Continuation details
- Development checkout: `codex/release-1-qa`. Existing release worktree: `docs/staging/knowledge-release.local`.
- Local synthetic UI server: `node scripts/preview-robot-studio.mjs`, port 4284. It uses fake account/database, real local published geometry; does not prove cloud persistence. Approved command prefix available. Session 3008 was running at checkpoint.
- Browser QA tab185 localhost; production SQL tab186 has only a read-only dependency query. Production application remains Phase1.
- Preserve unrelated Android IDE changes and existing untracked/ignored files. New studio files have not yet been committed at this checkpoint.

## 11 October continuation evidence
- Production-schema rollback preflight passed: all eight studio tables had RLS enabled. The transaction ended with ROLLBACK; no Phase 2 schema is deployed. The later recipient-share guard still needs the final combined rehearsal.
- Local browser verified real 6328 chassis + editable acrylic hopper, a side width change surviving selection changes, and nested isolation. Isolation was further corrected to hide ancestor geometry while retaining its transforms.
- Added subtree duplication, exact-asset node extraction as explicit reference copies, user-defined mounting frames, component search and envelope-gap measurement. Imported sources keep their original materials.
- Added assembly destination mapping via the existing atomic assembly requirement RPC, with upfront assembly revision checks. Local integration exercised this path and retry without duplicated assembly demand.
- Added explicit coupled demonstration ratios and independent sliders, named/annotated views, two-minute authorization expiry checks and pending inspector edits included on save/navigation. These latest interactions require final browser acceptance.
- Comment permission/idempotency tests passed. Added source extraction and coupled-motion domain fixtures; fixed negative-zero normalization exposed by the home-pose assertion; rerun remains due.
- Type checks passed through mounting-frame changes. Latest motion changes still need final compile/build.
- Preview session restarted as 95088; its fixture must return true for studio_source_access after the new access revalidation call. Browser source transport tab187 shows rollback SQL.
- Still no Phase 2 commits, pushes, production migration or frontend deployment. Do not present partial local implementation as complete.
