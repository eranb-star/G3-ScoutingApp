# Phase 3B - Balls and intake

Implemented for review; production promotion pending. Engine: g3-physical-v2.

- 64 dynamic fuel balls in a deterministic training grid, with rigid-body ball/ball, robot and field contact. This is not the official match starting layout.
- One instanced sphere draw for balls; no new downloaded assets.
- Intake toggle in the field toolbar, including fullscreen; keyboard I also toggles it. The green area shows the configured capture region.
- Robot-relative front capture zone, collection rate, capacity and full indicator. Outside-zone, rear, too-high, obstructed and fast relative-motion balls remain physical objects. Maximum relative capture speed is 3 m/s, a reference assumption.
- Collected balls are removed from the field and counted in abstract storage. Storage internals, jams, added robot mass and mechanism animation are not simulated. Reset restores the 64 balls and empties storage.
- Width 0.2-1.4 m, reach 0.15-0.6 m, rate 0.5-10 balls/s, capacity 1-60. Configure while paused. GLB does not determine these values.

Fuel dimensions from the locally reviewed FIRST 2026 manual: 15 cm diameter, 0.203-0.227 kg weight range. Model mass is 0.215 kg. Friction 0.65, restitution 0.3 and damping are uncalibrated practice assumptions; rigid spheres approximate foam, not compression/deformation. Official source: https://www.firstinspires.org/resources/library/frc/playing-field .

Validation: focused engine tests cover off/on, front/side/rear exclusion, rate, capacity, rotated capture, robot pushing, ball-to-ball scattering and reset. Phase 3A regression scenarios pass. TypeScript/build and fullscreen visual checks accompany the release. Physical school device and actual mechanism calibration remain outstanding.

Next: Phase 3C shooter/feed, trajectories and scoring. No shooting or scoring is included here. No SQL or APK changes.
