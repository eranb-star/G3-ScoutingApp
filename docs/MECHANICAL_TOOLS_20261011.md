# Mechanical Tools phase 1 — 11 October 2026

## Authorized scope
User approved the first release after reviewing the wider mechanical-tool roadmap. This release covers Engineering Hub entry, belt/chain calculations, diagrams, units, validation, saved versions, optional assembly links and print/PDF. Inventory matching, purchasing actions, shaft placement, additional calculators and catalogue acquisition are later phases, not delivered here. No AMB code, assets or datasets copied.

## Flow
- Engineering Hub now starts with Robot Software, CAD Mentor and Mechanical Tools. Existing `?view=code/logs/autonomous/tests/sources` links keep their destination.
- `/engineering/mechanical`: local calculation immediately available, without robot selection. Two modes: approximate shaft spacing → rounded tooth/link count, or existing tooth/link count → nominal spacing. Inputs in mm/inches are stored in mm; display rounding does not alter inputs.
- Select belt/chain and pitch preset/custom pitch, driver/driven tooth counts, known dimension. Result includes nominal spacing, selected theoretical length, requested-spacing delta, reduction, pitch diameters, wrap/engagement estimate, nearby alternatives and fullscreen SVG diagram.
- Advanced manual installation offset is separate from nominal geometry and is not a tension calculation. Limits and supplier checks are explicit. Chain uses even links by default; offset-link option is explicit.
- Save name/notes, optionally select an active build assembly. Private by default. Explicit sharing grants read-only access to active members; only owner updates, other members save private copies. Each save creates an immutable version; loading history creates a draft. Compare-and-swap revision prevents overwrites between devices; request UUID makes uncertain-save retries idempotent.
- Assembly parts view links into the same calculator with context. Saved assembly name is a snapshot. Return link opens the relevant assembly. No stock/machine/CAD mutations.
- Per-user local draft recovery works after the page has loaded; explicit cloud confirmation is separate. This is not guaranteed offline cold-launch support or background sync. Private mode/storage restrictions can prevent draft persistence and show a message.
- Print / Save PDF uses browser print, including current inputs, outputs, notes, assembly and draft/version identity. No external PDF service.

## Engine contract
`g3-drive-1`, original TypeScript deterministic implementation. Range: pitch 1–50 mm, 8–400 integer wheel teeth, spacing up to 10 m, length mode integer teeth or links; manual offset ±25 mm. Two parallel shafts, open path, no idlers/crossed paths.
- Belt: pitch radius `Np/(2π)`, tangent segments plus arc lengths, bracketed bisection for inverse spacing.
- Chain: standard two-sprocket approximation `L/p=2C/p+(N1+N2)/2+(N2-N1)^2/(4π² C/p)`; actual roller pitch diameter `p/sin(π/N)`. Chain result explicitly labelled approximate, with take-up/fit checks. Diagram is pitch-envelope illustration, not articulated chain geometry.
- Reject non-finite values, unsupported inputs, impossible lengths and overlapping pitch circles. No outside-diameter clearance, load rating or tension certification implied.
- Reference sources: [Renold installation/design guide](https://www.renold.com/media/165418/transmission-i-and-m-ren12-eng-10-10.pdf), [Gates synchronous belt design](https://www.gates.com/content/dam/documents-library/catalogs/powergrip-gt3-drive-design-manual-en.pdf). AMB was inspected as user workflow reference, not the numerical oracle. Its continuous-circle chain model differs from this explicitly labelled chain approximation.

## Data/security
Migration `backend/supabase/mechanical_tools_20261011.sql`: additive `mechanical_calculations`, `mechanical_calculation_versions`; RLS active member + owner/explicit sharing + assembly visibility. Older private versions remain hidden when a later version is shared. RPC is only write path, owner checked, active assembly validated, bounded document and typed dimensions. UI computes results from engine inputs; saved JSON is not executable or treated as approved engineering output. No credentials or private Onshape/GitHub data transmitted.

## Verification / release
- Numerical tests: equal-wheel analytic answers, unequal belt independent tangent/arc calculation, forward/inverse grids, wheel-order symmetry, rounding, impossible lengths, odd links, non-finite input, adjustments.
- TypeScript and Vite build passed (existing large-chunk warnings).
- Production-schema rollback tests passed: save, retry, stale revision, owner protection, invalid assembly, private/team current and historical access. Migration subsequently applied successfully.
- Browser fixture: 375px layout no horizontal overflow; chain odd-link error and imperial conversion; Hebrew RTL desktop. Final production save/reopen evidence and deployment IDs will be recorded after release.

## Remaining acceptance and later work
Student/leader physical fit checks with actual hardware remain necessary. No live load or tension testing performed. Theoretical sizes are not verified available products. No new APK; latest package predates these screens. Deferred integrations: inventory specifications/matching, purchase preparation, explicit Studio shaft anchors/placement and CAD revision freshness. Additional gears/motor/structural/pneumatic calculators remain future scope.
