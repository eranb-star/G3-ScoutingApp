# Robot Build expanded release — 9 October 2026

Current application source: `ec94263`; release branch application source: `9f11bee`. GitHub CI [326](https://github.com/eranb-star/G3-ScoutingApp/actions/runs/37962126289) and [327](https://github.com/eranb-star/G3-ScoutingApp/actions/runs/37962126850) passed. Production `HAs6G4y62ksGT4YU7rCGtHwoJHfG` is Ready and aliased to https://g3-6740.com. Post-deployment authenticated acceptance passed for Work → Open Robot Build, existing Parts, Workshop, Overview readiness, Assembly kits, maintenance links and event handoff. The previously failing assembly reads now load successfully; the browser reported no console errors during the final navigation. No physical records were fabricated.

## Delivered scope

- Direct **Work → Robot Build** entrance over existing projects: Overview, Parts, Workshop, Assembly & tests, plus Build details and Activity. Existing project/CAD links continue to open the same records.
- Revision-pinned Onshape BOM, exact-occurrence model inspection, live property observations, explicit missing metadata, freshness checks and conservative overlap/change review. Private geometry stays behind the existing owner-scoped CAD connection.
- Guided preparation, immutable uploaded work files with server hashes and checked part/revision association, scoped worker downloads, existing release/QC approvals, persistent form drafts and guarded navigation.
- Raw-material reservations shared with printing; dimensional/material checks; measured remnants; ordered operations; shared workshop resources; partial accepted/rework/scrap/held lots; conserved stock assemblies and inspected disassembly.
- Existing procurement/finance continuation including pack quantities and partial coverage; exact kit requirements; independently approved substitutions; downstream holds and scoped CAD-change decisions.
- Existing installation/WIP adoption without invented warehouse history; maintenance component/repair/retest links; subsystem readiness; Academy links and completion reuse; intended repository/commit provenance; pinned simulation-plan references; event/physical-configuration/packing handoff.

## Deployment evidence

All 30 additive migrations listed in `apps/dashboard_web/scripts/test-robot-build-release-rehearsal.mjs` were applied to production after passing the combined rehearsal twice. Existing one BOM/two lines remain; no manufacturing jobs or output batches were fabricated. The new work-file bucket is private. Direct handoff mutation is denied; mutations use authorized RPCs.

`onshape-connector`, `github-repositories` and `robot-build-files` were deployed and their editor source compared with the tested bundles. Existing callback/authentication settings were retained. No role-default permission expansion or public CAD sharing was performed.

Final acceptance found and fixed two actual integration defects: pinned model inspection incorrectly queried private CAD tables from the browser; it now resolves the snapshot through the owner-scoped backend. Assembly/readiness/handoff queries ambiguously joined tasks through both primary and retest/release foreign keys; the corrected release explicitly selects the primary task relationship.

## Verification and limits

All 59 configured CI scripts and web build passed. Local TypeScript/Vite, Onshape handler/identity tests, simulator/VR regression and database-backed engineering/review acceptance passed. Connected acceptance used the existing real rake BOM: correct two distinct parts/three occurrences, separate selection of both gear occurrences, fullscreen, source freshness and real property reads. Missing Onshape values are shown as missing rather than inferred. Linked-plan tests verify explicit load, exact revision, denied access and preserved draft.

Quantity, retry, concurrency, permissions, substitution, release holds, purchasing and maintenance chains were tested against isolated schema fixtures. Live production read acceptance does not prove physical manufacturing, purchasing or inspection. No fake orders, stock movements, student certifications or physical test evidence were created.

Scoped recovery succeeded using the existing recovery project: current Robot Build records restored and compared; all 21 Storage objects restored locally with matching hashes; actual BOM geometry restored to the private cloud bucket and downloaded with the same hash. No new paid project. This is not a full-current-application disaster-recovery or RTO certification.

## Android deliverable

`releases/G3-Team-Hub-2.4.0.apk`, package `com.g3.scouting`, version 2.4.0/code 27. Release assembly and lint passed. All 106 bundled web files match release `9f11bee`. Existing signing certificate is preserved.

- Size: 69,933,645 bytes.
- APK SHA-256: `9DF888521619FFDDF54BBCFD62B152F7C24890B1AB4550EA19A70759E82D7469`.
- Certificate SHA-256: `45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580`.
- Physical Android installation/login/download acceptance has not been performed. Do not call a signed build a device test.

## Explicit remaining acceptance and provider boundaries

1. Real workshop pilot: team leader selects a genuine released part; student performs the operation; independent reviewer inspects actual output; inventory/installation/retest are recorded from real observations. Software supports this chain; physical evidence cannot be manufactured by a remote test.
2. Install this APK on a physical supported phone and exercise authentication, assigned work, file downloads and deep links. Browser/synthetic responsive checks do not replace this.
3. Automatic native Onshape drawing/STEP/DXF export is not delivered. The supported release-file path is an uploaded, immutable, human-checked revision association. CAD model inspection and Onshape deep links are available.
4. Full application recovery timing and all-domain disaster recovery remain separate from the verified Robot Build scope.

Rollback: restore a compatible prior frontend/backend only after considering the new records. Keep additive tables, stock/audit history and server gates. Do not drop history or weaken access to work around a UI failure.

---

## Historical first release — superseded where the expanded release differs

# Robot Build — production release, 9 October 2026

Production: https://g3-6740.com/projects. Existing project → Robot build → Parts & sourcing / Manufacture & inspect / Assemble & install. CAD entry: Engineering Hub → CAD Mentor → Assembly parts → Save private project draft → Review project parts.

Source `589943e`; release `d0e6231`; Vercel production `DSp5YL17bBRgWr95RiLVRn3jqJiV` (4g4i4iey7), Ready. Preview `HNk6uzG8DPVXHggv8j661PE8TJG9`. GitHub CI [300](https://github.com/eranb-star/G3-ScoutingApp/actions/runs/37904209510) and [301](https://github.com/eranb-star/G3-ScoutingApp/actions/runs/37905410154) passed.

## Delivered

- Revision-pinned structural Onshape assembly quantities, repeated/suppressed/nested instances, reviewed purchased-assembly boundaries, complete-coverage requirement and private project drafts. Explicit owner-controlled project sharing includes parts metadata only, not geometry, credentials or AI reviews.
- Manual requirements; make/buy/reuse/exclude review; inventory matching; conservative cross-root/revision overlap reconciliation; prevention of restoring covered demand or silently reducing its covering requirement.
- Existing project task/release/QC coupling, editable operation templates and per-step counts, partial progress, material plan audit, actual consumption/returns, scrap/rework evidence, one-time accepted stock receipt after final physical QC.
- Shared stock reservations, issue/return, printing availability protection, shortages through existing purchases and original-request adoption. Existing purchasing approval, receiving and finance remain authoritative.
- Previously built stock verification without stock inflation; accepted-batch kits; exact approved installed configuration; replacement history and required existing robot-verification task. No automatic refund or acceptance of removed parts.
- Three-stage EN/HE project navigation, existing task/inspection links, mobile wrapping, paging for large BOMs, and archive guidance when manufacturing history prevents task deletion.

## Deployment and acceptance

Applied in one transaction after successful rollback-only production preflight: `robot_build_jobs`, `robot_build_bom`, `robot_build_stock`, `robot_build_manual`, `robot_build_reconciliation`, `robot_build_manufacturing`, `robot_build_installation`, `robot_build_operations`, `robot_build_purchase_reuse` (all `_20261009.sql`). Live schema query confirmed row security on Robot Build tables. No role-default changes or sharing of existing CAD data.

Updated existing onshape-connector through its Code editor. Bundle SHA256: `F927309A93041DE9D432F2CEB749CB3DA76AEFDBCE113540B946856D71C480F3`. Existing authorization and callback configuration retained.

Local SQL acceptance covers stock/quantity conservation, stale writes/retries, scope changes, protected history, operations, scrap, material ceilings, purchase reuse, physical QC, kits, exact installation, replacement and retest linking. Combined integration uses the actual existing engineering migration/approval chain. Structural tests include large/nested/cyclic/unresolved/configured/suppressed assemblies; existing Onshape handler authorization tests pass. TypeScript and Vite pass, retaining existing large-bundle warnings.

Live authenticated acceptance: opened the real rake assembly at `124ada7d`; Assembly parts returned one Part 49 and two Spur gear occurrences (two distinct revisions, three instances). Saved its private draft into the existing CAD project, followed the returned project link and verified persisted quantities, private status and overlap-review controls. Did not share the draft, approve its engineering, assign students, order items, move physical inventory or request Gemini review. Existing project manufacturing entry and empty state loaded successfully.

Phone EN/HE review used synthetic data; client/scroll widths both 375px. Screenshot `staging/robot-build-lifecycle-he-20261009.png`. Production deployment proof `staging/robot-build-release-20261009.png`. No actual Android device acceptance; bundled APK remains 2.3.1/code26.

## Operating boundaries

Final QC accepts a whole job before its output batch; use separate tasks/jobs for independently inspected lots. Material plans record anticipated demand but do not reserve raw material. Parent/child overlap warnings are conservative leader decisions, not geometric equivalence analysis. Existing requests with partial-order children must be reconciled through their original purchasing chain; received items through stock verification. The system does not infer missing manufacturing history, configure machines, certify robots or edit Onshape. The team still supplies released instructions, actual counts, inspection evidence and verification of its physical configuration.

Rollback: restore prior frontend deployment and connector source if required. Leave additive records and audit tables intact; do not drop production history. Database behavior is separate from frontend rollback. Preserve the existing inventory/printing reservation integration when repairing a release.
