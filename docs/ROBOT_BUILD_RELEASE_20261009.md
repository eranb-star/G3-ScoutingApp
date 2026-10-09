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
