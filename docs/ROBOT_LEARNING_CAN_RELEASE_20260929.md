# Robot learning lab and CAN workshop release

User approved production on 29 September 2026, requesting frontend-design review and practical CAN cable/connector teaching. Includes prior implementation commits f79ed39 and d4403a4. Deployed to production; acceptance below supersedes the prior local-only lab status.

## Delivered scope
Skills Academy → Robot learning lab (`/growth?view=robot-lab`) now provides a CAN wiring workshop even before loading CAD. Native modal dialog retains the underlying robot workspace, traps focus and supports Escape. Three bilingual steps: bus topology, hardware-specific connection, inspection/diagnosis. The hardware selector covers roboRIO spring terminals, SPARK MAX cable connections and Kraken X60 ring terminals. Actual WCP illustration is loaded remotely with a persistent source link if the image fails. H/L schematic is an educational example, not an inferred harness of either reference robot.

Teaching includes polarity, twisted-pair chain, two endpoint terminators, power-off resistance checks, individual crimp inspection, strain relief and device discovery after inspection. Kraken torque/screw settings apply explicitly to X60 CAN terminals only. No invented universal stripping length or torque. No claim that a 60-ohm reading certifies reliability. This is instructional content, not telemetry or an automatic wiring diagnosis.

Primary sources checked 29 September 2026:
- https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/can-wiring-basics.html
- https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-1/intro-to-frc-robot-wiring.html
- https://docs.wcproducts.com/welcome/electronics/kraken-x60/kraken-x60-+-talonfx/overview-and-features/wiring-and-modularity
- https://v5.docs.ctr-electronics.com/en/latest/ch08_BringUpCAN.html

## Boundaries and regression lessons
Darwin/Limestone CAD exports do not document full harness routing or port mapping. Do not draw guessed actual wires. The workshop is hardware-specific general teaching. Future actual G3 wiring map needs the installed hardware and verified connections. Third imported robot/2910 export remains pending, as do persistent graded electrical exercises. Existing Academy grading, auth, database, paid AI, driving/VR and APK are unchanged. APK remains 2.2.0/code24.

Preserve user Android IDE changes, local Studio mockup and unrelated screenshot files. Deploy only these lab commits through the isolated release checkout. Verify the actual Academy page with global CSS; an isolated component preview alone does not establish production UX.

## Production release and acceptance
- Source `531dc0a8b56b0c68c91bae1984e7b8b92d951e84` on isolated `codex/knowledge-protection-release`; includes `c32f7fe`, `b7f50b6`, `531dc0a`. Working implementation commits: `f79ed39`, `d4403a4`, `5366e8f`.
- Vercel production rebuild `65JDMRsnRkW3kz8YRmrBbvMt3VH6`, Ready with g3-6740.com assigned. Deployment URL: https://g3-scouting-app-5qpe-r9irfwz6e-eranbos-projects.vercel.app . Rebuilt from preview with production environment; not a direct QA deployment promotion.
- Rollback: `BEawEmN8ZSAYsdciqeVyXA2ySG5p`, source `0fe362c01b08ea0577c966f35e6113957b98ef29`.
- TypeScript and Vite production build passed in both working and isolated release trees. Existing large-chunk warnings remain. Real-CAD mapping/integrity tests and existing Academy assessment verification passed.
- Authenticated production Academy navigation exposes the lab; actual global styles checked in the CAN modal and expanded CAD workspace. Darwin loaded 1,090 meshes; electrical overview shows 155 relevant instances and fades surroundings. Full-window canvas and controls verified visually.
- CAN hardware selector, WCP terminal illustration and documented specifications verified on production. English and Hebrew lesson steps and Escape dismissal verified locally. Screenshot: `docs/staging/robot-learning-can-production-20260929.png`.
- Browser viewport override produced invalid narrow captures during mobile tooling checks; it was reset. Do not claim completed mobile visual acceptance or physical phone/headset testing. Responsive styles are included; no VR code changed.
- No database writes/migrations, course assignment changes, paid requests or APK release. The workflow is Skills Academy → Robot learning lab → CAN wiring workshop. Direct entry: https://g3-6740.com/growth?view=robot-lab .
- Production Limestone also completed all five verified asset loads (1,181 meshes), with complete assembly rendered. Browser error log reported none during final acceptance.
