# Robot learning: subsystem navigation and second robot

Status: implemented and locally verified, 29 September 2026. Not deployed to production; no APK change. Supersedes the single-robot status in ROBOT_LEARNING_LAB_20260929.md. User explicitly authorized both subsystem teaching navigation and a second imported elite robot, with an alternative if 2910 cannot be exported.

## Delivered behavior
- Skills Academy lab now has two selectable in-app 2026 models: 6328 Darwin and 1678 Limestone. Both use the same orbit, part zoom, isolation, visual separation, full-window and learning UI.
- Students choose Whole robot, Electrical overview, Power, CAN & control, Network & vision, Intake, Shooter, Hopper or Drivetrain. Relevant named geometry and assembly descendants remain opaque; other geometry fades. Anonymous assembly fasteners inherit their published assembly membership. No search through the full mesh catalogue required.
- Electrical groups include component shortcuts: main breaker, power distribution, mini power module, radio, and available battery/holder, Mac mini/mount and roboRIO-mount references. Only shortcuts with matching named geometry appear. Selecting one frames that geometry automatically.
- Individual-part search is optional/collapsed initially. Names/mounts are not treated as proof of a fully modelled device. No imagined roboRIO is added when only the mounts are identifiable. CAN does not match the words “Trash Can.”
- General power, CAN and Ethernet connection guide is separate and explicitly labelled as an FRC example, NOT either robot's verified wiring diagram. Links to illustrated WPILib instructions and 1678's documented access/terminal failures. No source establishes complete cable paths or pinout in these CAD exports; do not draw inferred wires as actual team wiring.
- Observation notes are separate per selected robot for this mounted workspace. Still transient/exportable, not cloud progress or graded qualifications.

## Second model provenance and access
2910 Re•Blitz public Onshape was opened and explicitly displayed “This document was shared via a link and is view only.” No export obtained. Do not replace real model integration with an iframe and call it done. 2910 remains an external comparison, not a selectable imported robot.

1678 officially published its CAD/code at https://www.chiefdelphi.com/t/1678-citrus-circuits-2026-cad-and-robot-code-release/521535 . The app loads the team's public GitHub model files directly on demand, rather than redistributing/mirroring their CAD in our public assets. Attribution is Citrus Circuits / public team export, NOT MIT. An asset-specific redistribution license was not established; this implementation does not resolve or invent one. Internet access to raw.githubusercontent.com is required; do not promise offline availability.

Pinned revision: `0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677`, repository `frc1678/C2026-Public`, folder `assets/Robot_Comp`. Five GLBs total 44,606,536 bytes, 1,181 browser mesh instances. Exact URLs, SHA-256/size and published assembly configuration: `src/lib/limestoneManifest.json`. Download verifies every file before parsing and stops on mismatch. Models load sequentially to bound parsing memory; model switch aborts previous loading. User-facing load action discloses direct GitHub source and approximate size.

Inspection scene uses published config rotations and CompConstants intake/hood reference offsets. Stationary unextended inspection pose, not a calibrated dynamic robot simulation. See same-revision `src/main/java/frc/robot/mechviz/comp/CompConstants.java`. No changes to playable robot selector, VR or simulator physics.

Reproducible audit: `node scripts/inspect-limestone.mjs`. Downloads to ignored `docs/staging/limestone-learning.local`, writes only metadata manifest into app source. Do not commit downloaded binary audit files. Dynamic inspection registry/mappings live in `src/lib/robotLearning.ts`, independent from simulation's publishedRobot loader.

## Acceptance
- TypeScript and Vite build passed; existing bundle-size warnings remain.
- `node scripts/test-robot-learning.mjs` passed: actual Darwin names cover all groups, assembly ancestry included, false Trash Can classification excluded, corrupt first remote file rejected without proceeding.
- Actual browser: Darwin electrical overview exposes 155 mesh instances; Limestone loads all five verified files and renders a coherent complete assembly (1,181 instances), electrical view exposes 329 instances. Full-window controls retained. Power distribution shortcut frames the actual distribution geometry with surroundings faded.
- Previous EN/HE framework retained; this increment adds translated controls/guidance. No physical phone/headset acceptance claimed. Saved desktop screenshot: `docs/staging/robot-learning-electrical-20260929.png`.
- Regression boundaries: no auth, paid AI, schemas, Academy grading, Studio driving/VR, intake/shooter physics, or APK source changed. Do not describe build success as a production release.

## Still outstanding, without reopening delivered work
- Verified actual robot wiring harness diagrams/port mappings; generic guide is not a replacement.
- Third imported robot / 2910 export if available; the two-model minimum now works locally.
- Rich manufacturer-specific electrical exercises, assembly-order constraints, editable placement variants, full bilingual assessment pack, persistent evidence/mentor workflow integration, uploaded team CAD recommendations remain as recorded in the prior roadmap.
- Production acceptance/deployment and eventual APK refresh. Existing APK 2.2.0/code24 unchanged.
