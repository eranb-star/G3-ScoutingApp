# Simulator fidelity increment — 2026-09-23

User authorized all five increments: intake physics, official AprilTags, detailed inspection, a genuine published robot and a local computer opponent. Orbit 1690's view-only Onshape/Parasolid release could not be directly imported with the available tools. User explicitly asked to find another leading team's usable release rather than require their CAD access.

## Implemented scope

1. **Intake contact and feeding.** Reference arms now have colliders attached to the same Rapier robot body. A powered compliant roller pulls balls toward a throat before storing them, after deployment; collection is no longer immediate anywhere in the intake rectangle. Full storage stops feeding and makes the roller solid. Off/stowed arms remain physical. Rotation is positive around local Y: the bottom surface moves inward along -X. Roller clearance and fold height are constrained. These are reference/estimated contact parameters, not a calibrated deformable-ball/real mechanism model.
2. **Official 2026 tags.** All 32 FIRST tag patterns extracted from the official printable PDF, with 6.5-inch black squares and a one-cell white margin. Pinned WPILib v2026.2.2 welded-field poses transformed into the existing CAD frame (180-degree Z rotation and centered origin). Existing rounded field metadata differs by less than 1.0 mm; AndyMark differs by up to 22.1 mm and is not used. The scene uses precise welded poses, front-facing artwork and surface depth offset. No synthetic patterns or guessed IDs. This does not implement camera detection or simulated localization.
3. **Inspection.** Camera menu → Inspect parts. Click a visible CAD mesh to focus, orbit/pinch/scroll down to millimetre-scale viewing distance, hide/isolate a part, or restore the whole robot. The near plane is reduced only in inspection. Fullscreen controls stay compact. No detail absent from the supplied CAD is invented; low-resolution/exported components remain limited by their source.
4. **Published robot.** Robot model → Your robot → 6328 Darwin (2026). Five authentic GLBs, source revision `a6239fd90e8de72a7c1870c3c189820fcef6552d`, MIT license retained, each download SHA-256/size verified. Component poses follow the team's DarwinMechanism3d and CAD zeroing configuration; intake uses the published angle limits. Stowed rendered bounds approximately 0.8763 × 0.8509 × 0.55914 m. Profile uses those conservative dimensions; mass, traction, speed, intake transfer and ballistics remain estimated. Rear-facing firing is supported; the collision-envelope outlet is approximate, not a validated launcher calibration. Stored-ball markers are illustrative packing. KitBot and local GLB import remain available. Assets use the existing bounded 80 MB cache.
5. **Computer opponent.** Select Off, reference robot, or Darwin CAD under Robot model. One local deterministic practice controller navigates, collects and shoots; no LLM/API cost. Both robots use the same world, field, 504 balls and robot contacts. Separate inventories, cooldowns, shots and scoring attribution prevent opponent scores entering the driver's practice results. Opponent pose is captured in the existing bounded replay. Follow computer robot is available in the camera menu. This is a practice opponent, not a reproduction of a team's robot software, six-robot match, rules engine or competition-quality tactical AI.

## Sources and reproducibility

- FIRST artwork: https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/2026-apriltag-images-user-guide.pdf
- Layout: https://github.com/wpilibsuite/allwpilib/blob/v2026.2.2/apriltag/src/main/native/resources/edu/wpi/first/apriltag/2026-rebuilt-welded.json
- Robot: https://github.com/Mechanical-Advantage/RobotCode2026Public/tree/a6239fd90e8de72a7c1870c3c189820fcef6552d/ascope_assets/Robot_Darwin
- Source manifests and checksums: `public/twin/2026/tags/provenance.json`, `public/twin/robots/6328-2026/provenance.json`.
- `scripts/generate-frc2026-tags.py` reproduces all 32 textures from the hash-pinned PDF using Poppler/Pillow. Raw PDF/render intermediates are not committed.

## Acceptance

- New fidelity regression checks feeding delay, shared ball conservation, autonomous scoring, independent player results, opponent replay state, all 32 layout transforms and real CAD hashes/dimensions. Both front-shooting reference and rear-shooting Darwin opponents score in the test.
- Existing intake, physical drive, shooting, scene polish, hopper, telemetry, controller, graphics quality, practice/venue and VR regression tests exercised. Hopper's old ten-frame immediate-capture assumption changed to a bounded two-second deployment/feeding wait; identity and animation checks remain.
- Browser verified real Darwin loading, part focus/isolation/restore, compact fullscreen controls, real tag appearance/placement, and a Darwin opponent collecting/scoring with a separate player inventory. Observed desktop performance is not headset or phone acceptance.
- Physical Quest/phone performance and controller usability, real robot intake calibration, collision geometry accuracy beyond reference proxies and all full-match rule acceptance remain open. No new APK, database migration or paid AI changes.

## Release status

Production source `b65e92933a4b01f33e21062ae16e3dd69ef43bd6` (includes `17616d8`), Vercel `2t2Bh17M3CMKA24JmLapC4j6vyZY`: Ready / Production, g3-6740.com domain verified. Preview `2VCBE3N2XyasSUv3pWfmXvkNEcpN` promoted through a production-environment rebuild. Primary implementation commits `3420ada` and `35122e1`. TypeScript and production build passed in the isolated release worktree. Rollback is the previous shared-practice/venue production `FEZ7Svcb4FTfKrXxZzFH6eHE8GgQ`, source `7c7759a`; no database rollback required.

Authenticated production smoke check: physical engine v4 loaded; Darwin downloaded with verified hashes; genuine geometry and hopper markers rendered; inspection/whole-model framing and official tags were visible. The reference computer opponent visibly collected and scored 13 balls while the Darwin player retained eight preloads. Follow-computer camera showed its robot, intake and hopper beside the official tags. No browser console errors observed. Desktop performance in this smoke check ranged approximately 27–41 FPS; no headset/mobile performance guarantee is made. APK 2.2.0 remains unchanged.
