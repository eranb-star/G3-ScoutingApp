# Mechanical Tools phase 1 — 11 October 2026

> Release-history note (18 October): current website/APK and remaining work are in [the checkpoint](CURRENT_CHECKPOINT_20261009.md) and [current plan](REMAINING_WORK_MASTER_20261018.md). APK2.6.1 includes this release. Older pending/build/no-APK entries below describe intermediate or release-time state; final evidence takes precedence.

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
- Browser fixture: 375px layout no horizontal overflow; chain odd-link error and imperial conversion; Hebrew RTL desktop and enlarged diagram open/close.
- Deployed source **a3f48b8**, release **d8cdb47a936c8e5adff11f5140ef7adfa96c2635**. CI375 and CI376 passed, including the new numerical test. Production **4GW7VZdLx5UC6hvTYiub8vUi3hy8** is Ready on https://g3-6740.com, promoted/rebuilt from preview **EUD9wyZJkSGSoXRemcGk8gqqiKb8**. Previous production **4M3RwBLoTxkmVmR8rc1Fhw68rwGt** remains the frontend rollback target; additive calculation tables can remain if reverting the UI.
- Live acceptance: Engineering Hub three-entry landing → Mechanical Tools; saved private “Example · intake belt spacing” version 1, started a new calculation, reloaded, reopened the saved record from the cloud list and opened immutable version history. Result preserved: 136 teeth, 680 mm pitch length, 249.268 mm nominal spacing. Production phone-width check measured 375px client width and 375px scroll width; result/diagram remained readable. Screenshot `docs/staging/mechanical-tools-production-20261011.png` is local evidence. No actual build parts, inventory, purchases or CAD changed. No assembly existed in the live picker during acceptance, so real-team assembly selection was not exercised; schema/link validation was tested separately.

## Remaining acceptance and later work
Student/leader physical fit checks with actual hardware remain necessary. No live load or tension testing performed. Theoretical sizes are not verified available products. No new APK; latest package predates these screens. Deferred integrations: inventory specifications/matching, purchase preparation, explicit Studio shaft anchors/placement and CAD revision freshness. Additional gears/motor/structural/pneumatic calculators remain future scope.
