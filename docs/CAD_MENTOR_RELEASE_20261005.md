# CAD Mentor production release — 5 October 2026

## Current release
Website: https://g3-6740.com/engineering/cad, under Work → Engineering Hub → CAD Mentor.
Frontend production source c2df378; Ready deployment AVwiEmPi1EJP78nHxYS55LYDuLZ8 (edsgeche8). Backend includes the subsequent citation-range correction d9fad99 / release 0ece774, deployed separately through Supabase. Earlier connection-only and initial viewer deployments are superseded. APK unchanged: 2.3.0 / code25; no new Android bundle was built.

## Delivered flow
1. Connect the G3 Onshape account with OAuth2Read. Credentials remain server-side and encrypted using Supabase Vault. The authorized connection and selected designs are private to the initiating active G3 admin.
2. Browse accessible documents with pagination, select a Part Studio/Assembly, or paste its exact tab URL. Document + tab names distinguish otherwise identical Part Studio names.
3. Import the current immutable microversion. View actual provider tessellation, orbit/zoom, select and isolate parts/sketches, fit the model and use nearly full-screen inspection with controls retained. Sketch-only and unfinished designs are supported; empty assemblies are not labeled defects.
4. Record design intent/requirements, ask a specific question, explicitly consent to send selected evidence to Google Gemini, and receive a metered review with source citations tied to the exact revision. Reviews use structured features/parameters/constraints and assembly structure, not a physical solver.
5. Keep saved reviews; record findings, proposed fixes and verification evidence. Make source edits in Onshape, import the resulting revision, and explicitly verify. Findings never close automatically just because geometry changed.

## Live acceptance and regressions
- OAuth callback succeeded following separate user approvals for the read-only grant and the callback endpoint's legacy JWT switch. Only onshape-connector has this switch disabled; function POSTs independently validate active admins and source ownership. Callback state is one-time and expiring.
- Real master-sketch and insert Part Studios imported, pinned, rendered and reviewed. The user separately authorized those designs' CAD evidence/questions to Gemini. Three paid review requests were made: initial insert acceptance, corrected insert review, master-sketch review. No automated retries or extra unrelated AI calls.
- Master sketch retained its real feature/entity/constraint counts and explicitly reported omitted detail records. A useful open finding records the need to agree design purpose and driving dimensions with the CAD lead; no physical verification or source edit was claimed.
- Actual provider typed feature envelopes were missing from fixtures. Fixed recursive normalization and preserved original snapshot evidence. Geometry cache version advanced to v2; a fixture covers the typed format.
- Initial insert review was wrong because large sketch details crowded a later REMOVE extrusion out of the AI context. Fixed full feature inventory + all feature headers before detail chunks; compacted bookkeeping; regression test proves a large sketch cannot hide downstream operations. The flawed review has validation_note, cannot create new findings in the final UI and is collapsed as audit history. The corrected answer identifies the actual downstream removal feature. Do not repeat the flawed answer.
- Grouped and ranged citations are validated against the supplied allowlist; unknown/out-of-range IDs fail closed. The one missing ranged reference on the master-sketch acceptance record was repaired without changing the answer. Review record 071fc72e-c243-4ae1-9858-bd85dfa99786; superseded test record 1e0f95ef-49a8-41fd-a888-20a755b061b4.
- Client ID/Secret input is trimmed; explicit Continue to Onshape link avoids silent browser navigation failure. Do not regress either fix.
- Local TypeScript, production build, security, handler, immutable-snapshot, database privilege/rerun and geometry/evidence tests passed. GitHub CI 280/281 passed with CAD tests included, and citation-range correction CI 282/283 passed (earlier 278/279 also passed). Responsive Hebrew and fullscreen controls checked in an isolated fixture; actual solid and sketch verified in production, including isolation and retained full-screen controls. Final production mobile viewport emulation did not apply to the existing tab, so do not claim a physical-phone acceptance test. Private screenshots remain local under docs/staging, not committed.

## Storage, release and recovery
Applied cad_onshape_connection_20261004.sql, cad_vault_key_20261004.sql, cad_review_workflow_20261004.sql including validation_note. All CAD tables are service-role only with RLS. Geometry uses private cad-design-assets, bounded size, signed URLs lasting 60 seconds. Never copy OAuth tokens into chat, files or browser-visible responses.
Frontend rollback alone does not roll back database or Edge Function. Additive tables should remain; restore connector from a known-good committed source and redeploy if needed. Disconnect G3 invalidates the local connection; revoke the OAuth app in Onshape separately to revoke the provider grant. Keep other app releases intact.

## Explicit remaining work — do not confuse with delivered flow
- Sharing with selected CAD leaders/students and existing task/Academy assignment links require a deliberate permission/data-sharing design; no team-wide access was granted.
- Dedicated revision diff, automatic stale-finding remapping, aliases/subsystem organization, document folder tree and background imports for large assemblies remain.
- Viewer imports up to 60 distinct parts and 1,000 placements, maximum approximately 30 MB; exact large assemblies have not had live acceptance. Nonempty assembly transforms have fixture tests; inspected current team assembly tabs were empty. Do not claim complete assembly acceptance from single-part evidence.
- Exact interference/motion/clearance checks, dimension selection/section tools, materials/mass/CG validation, native proposed-edit previews and CAD writeback are not implemented by this release. No FEA, manufacturing certification, automatic robot configuration or simulator physics calibration.
- Review evidence is bounded (42 KB/100 records); omitted records are disclosed. A successful citation check establishes provenance, not correctness. Continue checking significant recommendations against actual geometry and engineering intent.
- A partial snapshot is retained immutably; same-microversion import does not currently replace its unavailable evidence. Recovery/versioned retry design remains needed for this case.
- Onshape plan/API availability after the observed Pro Discovery trial must be checked. Do not promise perpetual free access or unrestricted provider quotas.

The broader design in CAD_MENTOR_DESIGN_20261004.md is a roadmap, not a claim that every proposed engineering check is delivered.
