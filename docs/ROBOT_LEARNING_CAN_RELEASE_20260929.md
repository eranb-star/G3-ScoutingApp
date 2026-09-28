# Robot learning lab and CAN workshop release

User approved production on 29 September 2026, requesting frontend-design review and practical CAN cable/connector teaching. Includes prior implementation commits f79ed39 and d4403a4. Production status will be recorded below after verification.

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
