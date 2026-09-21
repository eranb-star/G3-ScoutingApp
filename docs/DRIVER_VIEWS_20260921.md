# Open intake and driver views — 2026-09-21

User authorized correcting the intake height/open structure and adding three driver-position views. Implemented locally; not pushed or deployed.

## Delivered

- Removed the solid black intake tray. Two round carbon side tubes and two spaced round cross-tubes form an open structure, with the existing roller, axle and chassis-mounted hinges.
- Fold angle includes roller/rotating-stripe clearance and is bounded by the displayed reference robot height measured before world/pose transforms (0.61036 m for bundled KitBot). Concept mode uses configured height. Tests cover all supported length/reach combinations, four heights, and intermediate fold positions. No physics/collider changes; uploaded CAD remains untouched.
- Camera menu adds Driver station 1, 2 and 3 for 2026. Red/Blue selection gives six fixed positions. Positions come from bundled public/twin/2026/field-config.json, not equal spacing. Red x=-8.2775425, y=[3.07975,1.25095,-1.8288]; Blue is the half-turn counterpart. FIRST manual section 5.9 / figure 5-14 verifies station numbering and tower between 2 and 3.
- Eye point is 0.60 m behind its station, adjustable height 1.10–2.00 m (default 1.65). Left/right and down/up looking rotate the viewing direction without moving the eye point. Reset looks at field center. Horizontal FOV is 90 degrees on wide layouts, vertical capped at 85 degrees on narrow layouts.
- Driver views force detailed field geometry, disable orbit/pan/zoom, and hide robot arrow, trail, intake diagnostic plane and geometry lines/labels. Geometry can actually occlude the robot. Existing field-relative keyboard controls and gamepad configuration are preserved. Historical seasons reset to orbit and do not offer unverified driver positions.
- English/Hebrew labels and wrapping controls; quality presets and existing views remain.

## Validation

- test-scene-polish: actual reference-frame attachment, deployed endpoints, folded/animated height cap including roller clearance, driver coordinate match to bundled config, fixed eye point while looking, portrait FOV cap, existing material isolation/texture checks.
- test-hopper-visuals passed; TypeScript and Vite production build passed (existing large-bundle warning).
- Browser: all three red views, blue counterpart, eye-height change and downward looking inspected. Lower eye height visibly exposes the station panel obstruction. Open intake inspected in close-up; current preview is localhost:4213.

## Practical limits / acceptance

This is modeled sightline practice, not an exact reproduction of human vision. No people, other robots, operator-console screens, venue glare or stereo/peripheral vision. Driver position setback is an explicit preset, not a measured individual's stance. Physical-field/device acceptance remains required. No automatic blind-spot report or automation recommendation is claimed. The intake is illustrative, not validated CAD or collision geometry. Existing fallback/loading messages still apply if the field cannot load.

Source: https://firstfrc.blob.core.windows.net/frc2026/Manual/HTML/2026GameManual.htm (section 5.9). Local asset configuration is the numeric placement source.

Preserve user Android .idea edits. Before production release, integrate simulator commits into the documented production baseline; do not deploy accumulated branch changes wholesale.
