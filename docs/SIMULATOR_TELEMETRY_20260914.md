# Live geometry, telemetry export and simulator settings — 2026-09-14

Implemented for the 2026 physical simulator. Local TypeScript/build, focused geometry/key tests and shooting regression pass. Browser checked recording, 430-sample JSON download with ordered ticks/time, remapped shooting, fullscreen and 390px settings layout. No SQL, provider calls or APK changes. Not yet promoted to production.

## Use

- Live geometry beneath the field: choose red/blue hub; toggle geometry overlays. 3D shows muzzle-to-target line, range/aim label and heading arrow; 2D shows target line/range.
- Values include centre X/Y, heading, actual rigid-body velocity, forward/left components, world-Z rotation rate, pitch/roll, actual muzzle origin, horizontal/slant range, target bearing and heading error. Expanded definitions include wall-envelope clearance; not all obstacles or legal field zones.
- Measurement origin uses the same shared muzzle calculation as shooting, including chassis quaternion/height. Initial/reset pose is read from the physical body, not an invented zero-height pose. Geometry references simplified physics, not independently surveyed CAD.
- New recording → drive → stop recording → Export CSV/JSON. Every 60Hz simulation step is recorded; pauses add no simulation time. Reset/configuration replacement ends recording. Limit 36,001 samples (initial plus ten minutes). Only current session is held in memory: export before replacing/leaving. JSON carries frame/schema/engine/field identity, UTC session start, fixed parameter snapshot and samples. CSV uses explicit unit-bearing field names where applicable and simulation seconds/ticks. JSON is the recommended companion for metadata.
- Settings now occupy full width below the viewport: Shooting, Balls & intake, Robot model, Dimensions & display, Driving & keys, Sources. One panel at a time; phone layout stacks controls.
- Driving & keys assigns physical A–Z/arrow keys to movement, CCW/CW turning, intake, shooting and reset. Duplicate assignments are disabled. Browser-local persistence and restore defaults. Space is reserved for disabling; starting uses the visible button. Field-relative translation remains distinct from turning. Remapping is locked while driving/recording. Text editing and modified browser shortcuts do not drive the robot.

## Explicit remaining steps requested by the owner

1. Physical replay integration: consume recorded inputs plus complete initial physics/ball/queue state and external events; pinned-runtime checkpoints/tolerance failure display; replay/ghost/comparison. Telemetry export alone is NOT replay or a restorable physics snapshot.
2. Software/controller integration: separate simulated ground truth from odometry/vision estimates, timestamped sensor noise/latency, software revision binding and isolated WPILib/controller/plant integration. PID numbers alone do not define a plant.
3. Real-robot calibration: measured intake/capacity, shooter exit/speed/trajectory, motor/drivetrain/contact data; datasets, error bounds and valid operating ranges. Only then claim predictive real-robot accuracy.
4. Later optional geometry coverage: calibrated trajectory prediction/target-plane errors, detailed per-obstacle clearance and versioned legal zones. Current overlay is a geometric aiming aid, not a ballistic hit guarantee.

Production remains the previously verified 17a542f until an explicit new deployment. The master remaining programme remains PAUSE_HANDOVER_20260913.md; this increment closes live geometry and telemetry capture/export only, not full Phase 3 or Phase 4.
