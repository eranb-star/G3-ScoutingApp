# Reference hopper and transfer visuals — 2026-09-21

User selected full-visual-package Steps 1 and 2. Local implementation only; no production deployment or push. Extends GRAPHICS_AB_20260921.md; wider scene polish remains separate.

## Implementation

- Only reference KitBot mat_13 (Bottom Hopper Panel, previously alpha .31) and mat_41 (Battery Access Panel, previously alpha .20) become opaque with matte plastic response. No blanket override of field or uploaded-CAD materials.
- Bumper number plates now use Front_Bumper bounds rather than the whole assembly, eliminating detached oversized plates seen in close-up.
- Stored IDs and a bounded 64-event capture/shot history are exposed in physics snapshots. Reset clears events and advances an epoch. Events are observations of existing actions; no changes to capture rules, shot timing/velocity, capacity, scoring or ball identity/accounting.
- One stored-ball visual per authoritative stored ID. Preloads, capture, shooting, empty/full and reset are represented. Reference packing follows the hopper panel slope; marker radius adapts to selected capacity (8–60). This is illustrative packing, not measured capacity or internal ball-collision simulation. Marker size can differ from the physical field-ball radius.
- Captures move from their observed robot-local capture point to their stored slot over .30 simulation seconds. Shots travel from the hopper toward the configured muzzle and converge to the existing physical ball trajectory over .16 simulation seconds. Each shot replaces that ball's field render instance during the transition, never adds another ball. Physics and telemetry remain authoritative; the short presentation transition is not a new physical trajectory. Pausing freezes tick-based transitions; reset clears them.
- Reference visuals apply only to the 2026 reference robot. Uploaded models retain physical field-ball rendering and toolbar count; no hopper position is guessed. Historical fields do not show this hopper simulation.
- Robot close-up camera option in EN/HE makes hopper inspection easy. Existing quality controls and physics remain separate. UI identifies packing/transfers as illustrative.

## Verification

- TypeScript project check and Vite production build pass; existing chunk-size warning remains.
- New test-hopper-visuals uses real physics: eight preloads, capture/shot IDs and no duplicate visible IDs, stored counts, paused state, convergence back to field trajectory, reset epoch/events and capacity 60.
- Existing intake and shooting/lifecycle regression tests pass, including conservation, capacity, scoring and repeated shot trajectory.
- Browser close-up: filled hopper observed, opaque panels and bumper labels inspected; shooting visibly changed 8 → 7 → 0 and empty hopper; reset restored eight and disabled driving. Preview reported 60 FPS locally; not a school-device guarantee. Desktop fullscreen inspected, normal viewport restored, preview left open.
- Actual physical devices, imported-CAD file acceptance and a full interactive collect-while-driving session were not repeated; capture transition is covered by the physics-backed test. No claim that every animation frame was visually inspected.

Preview: http://127.0.0.1:4213/ . Release integration must use the known production baseline, not deploy the accumulated main branch wholesale. Preserve personal Android .idea edits. Wider full visual package Steps 3–4 remain future work, not silently completed by these changes.
