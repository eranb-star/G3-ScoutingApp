# Phase 2 implementation — release preparation

User authorized end-to-end development after the final design review. This record is a working checkpoint, not a completion or deployment claim. Follow ROBOT_BUILD_PHASE2_3D_DESIGN_20261010.md; do not silently reduce its release scope.

## Latest checkpoint — 11 October, release preparation

Implementation includes the compose/edit/compare/present and reviewed-build journeys. Production is still Phase 1 at this checkpoint; no Phase 2 migration has been committed on the server and no frontend has been promoted.

- Completed local CAD task handoff through the existing project-task RPC, immutable source-version links, assignment/source-access checks and retry protection.
- Added approved-candidate reconciliation for changed adopted parts using the existing independent change-review decision. Old quantities and executed records remain unchanged. Repeated mapping cannot exceed the selected requirement quantity.
- Added independent viewer alternative selection, named joint/exploded/cutaway presentation steps, reusable saved assemblies, explicit selected-copy dimension edits, acknowledged findings that reopen on changes, paged design/history access, and per-account proposal drafts.
- Phone editor now uses bottom drawers for parts and numeric editing. Local 390px iframe checks exercised part selection and changing a copied hopper side from 600 to 650 mm; this is browser layout evidence, not a Samsung-device performance test. Final Hebrew-language fixture check is still being completed.
- All 72 scripts listed in required CI passed locally. TypeScript passed. Production Vite build passed (442 modules; Studio chunk ~130 KB / ~41 KB gzip; existing large-chunk warnings). Vite and software-workflow initially hit sandbox directory restrictions and passed when rerun outside that restriction. No check was disabled.
- Combined five-migration production-schema rehearsal returned nine tables, all RLS enabled, and ended with ROLLBACK. The production schema remains unchanged.
- CAD sharing tests include refusal to share a scene whose recipient lacks its private snapshot access. Follow-up and changed-adoption tests include retries, denied access and preservation of prior quantities.
- Team instructions: [3D Robot Studio guide](ROBOT_STUDIO_TEAM_GUIDE_20261011.md).

Remaining release work: commit and reconcile release checkout, required remote CI, apply additive migrations, deploy frontend, and authenticated mixed-source/save-reopen/build-handoff acceptance. Physical dimensions, named-device performance and an uncoached student pilot must remain explicitly unverified until observed. The catalogue is an attributed starter set, not an exhaustive FRC product library; missing batteries/controllers use the explicit import workflow. No fabricated centre-of-mass value is provided without centroid evidence.

The chronological entries below are superseded by this checkpoint where they describe earlier unfinished work.

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
