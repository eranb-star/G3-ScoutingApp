# Simulator baseline and Phase 3A - physical driving

Status: reference model deployed to production on 2026-09-13: e5bec43, Vercel GmhT4EkDQ, Ready. Live bundle index-BY-zgMiY.js verified HTTP 200, production Supabase, physical engine and practice controls. This extends the Field & Concept Twin and does not close every V5.2 Release 2/3 acceptance item.

## Scope and acceptance
- 2026 physical driving only; other seasons remain viewers.
- Fixed 60 Hz Rapier rigid-body world, gravity, four ray suspension contacts, friction-limited drive forces, acceleration, braking and chassis rotation.
- Solid field boundaries and hubs; bump traversal changes chassis height/pitch; trench beams and supports block insufficient clearance.
- Keyboard, touch and existing gamepad mapping; pause on focus loss/disconnect, reset and practice approaches.
- Imported GLB remains a visual asset. User-set length, width and height define the collision envelope. CAD does not supply mass, intake capacity or controller dynamics automatically.

## Versioned assumptions: g3-physical-v1
Reference mass 50 kg; nominal clearance 0.08 m; four support points at 38% of length/width from centre; spring 10,000 N/m and damping 700 N s/m per contact. Drive force capped at 150 N total (3 m/s2 nominal), further limited by contact load. These are baseline assumptions, not measurements of robot 6740. Wheel rotation, motor/electrical dynamics, PID and deformable bumpers are not modelled.

Collision geometry is simplified and separate from the detailed visual GLB. Bumps use triangular convex prisms 1.128 m deep, 1.854 m wide and 0.1654 m high; their slope is an approximation. Trench openings use 1.279 m width and 0.5652 m height. Hubs use solid box envelopes. Nets, tower climbing and small field fittings are not simulated. The detailed field checkbox never changes physics.

Dimension reference: FIRST 2026 REBUILT manual, field descriptions (locally reviewed pages 22 and 25); authoritative resources: https://www.firstinspires.org/resources/library/frc/playing-field . Physics library: https://rapier.rs/docs/user_guides/javascript/rigid_bodies/ . Future geometry revisions must update this baseline and affected scenario checks.

## Focused validation
`node scripts/test-physical-drive.mjs` in apps/dashboard_web checks acceleration, braking, hub collision, bump crossing/elevation/pitch, tall-robot trench blocking and short-robot passage. TypeScript and Vite build passed. Bump test observed about 0.087 m chassis rise and approximately 12 degrees pitch; chassis rise differs from ramp peak because the wheelbase spans the slopes.

Browser smoke review covers engine initialization and start/stop. Real school CAD, physical controller and representative school hardware calibration remain external acceptance work. Render FPS and simulated 60 Hz are different; a slow renderer can run slower than real time and is not qualified driver training.

## Next milestones
1. Calibrate this reference against team dimensions, mass, measured acceleration/braking and bump/trench video at school; tune only against evidence.
2. Phase 3B: balls, contact/scatter, configured intake capture zone/rate and storage capacity. No automatic reliable capacity inference from GLB.
3. Phase 3C: shooter/feed rate, trajectories and scoring; measured launch parameters first, motor/PID model only with plant data.
4. Physical recording/replay and scenario comparison with engine/config versions; old planar recordings are incompatible and their controls are unavailable here.
5. AI budget/security controls before new paid AI actions; engineering/CAD/manufacturing/orchestrator work remains in the master roadmap.

No new SQL or APK is required for this browser-only milestone.
