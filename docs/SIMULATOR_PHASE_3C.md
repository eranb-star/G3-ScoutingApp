# Phase 3C - shooting and continuous ball lifecycle

Review implementation, engine g3-physical-v3; production promotion pending.

## Starting inventory
Standard total is 504. The single-robot setup allocates 400 neutral balls, 24 per depot, 24 per outpost chute and eight preloads. The five absent robots' unused preloads go to neutral per section 6.3.4. A full six-robot match with all robots preloaded would instead have 360 neutral and 48 robot preloads. Outpost balls are held in inventory until a user feeds them; they are not incorrectly placed on the ground. Neutral staging uses two single-layer packed blocks with a centre gap; it is an approximate deterministic arrangement, not a replay of field-crew placement. Championship 600-ball setup is not exposed in this UI.

Sources: FIRST manual TU22, sections 5.4 and 6.3.4, locally extracted pages 23 and 43-44. Current manual version confirmed through https://www.firstinspires.org/resources/library/frc/season-materials . Hub return context: https://community.firstinspires.org/2026-fuel-counter-update . No deflector plates are modelled.

## Lifecycle and controls
Every ball has a stable ID in exactly one location: physical field, robot storage, hub processing queue, outpost inventory or out of play. Collection removes its rigid body. Shooting consumes that same stored ID and creates one moving body; no ammunition is invented. Entering the hub removes that body temporarily, then returns the same ID from one of four neutral-facing outlets. Misses keep their bodies and roll/bounce. Out-of-field balls are tracked separately and can be manually returned to the blue outpost, then fed back onto the field.

Keyboard F or toolbar Shoot toggles continuous feeding while simulation is enabled. Space/pause/focus loss stops feeding. Empty storage cannot fire. Configure launch speed, elevation, feed rate and muzzle height while paused. Launch velocity includes chassis motion and orientation. Example: choose Shooting at blue hub, use defaults 5.6 m/s, 65 degrees and 0.8 m muzzle height, toggle shooting, Start driving. Initial eight preloads provide immediate ammunition.

## Physics boundaries
Robot hub envelope remains solid. Balls use a hollow six-sided rim/receiver, lower body and neutral-facing back net. A descending ball centre must cross the 1.83 m entry plane fully within the 1.06 m opening, allowing for ball radius. Geometry approximates the sloping real receiver with a horizontal entry and does not reproduce every field fitting. Rim/net misses can deflect. Practice goals count once per entry; both hubs are enabled. Match shifts, alliance legality, penalties, ranking points and certified scoring are not implemented.

Hub transit is a one-second delay followed by repeatable four-outlet dispersion. Exit speed/angle, foam restitution/friction, air/rolling damping and launcher behavior require measured calibration. Internal hub conveyor/chute motion is abstract. This is not a PID/motor/flywheel model; measured muzzle speed is the input. Detailed rendering uses one instanced ball mesh, capacity 600; static CAD fuel remains removed.

## Validation
Focused shooting tests cover 504 inventory and unique IDs, storage-to-shot transfer, one goal and neutral return, misses, outside-opening rejection, empty storage, outpost feeding and out-of-play recovery. Intake and physical-driving regression scenarios pass. A 120-step headless run with the starting population took approximately 0.27 seconds on the development machine; this is not a school-device rendering benchmark. Browser firing smoke check and build accompany the review deployment.

No SQL, APK, new AI calls or production deployment is required by this change. Remaining realism work is calibration against team hardware and field video, not silent claims of exact game physics.

Starting stability correction: neutral fuel is single-layer; initially resting bodies sleep until contact. Depot upper balls rest directly on the lower balls. The 120-step idle check keeps every field ball within 1 mm of its initial pose; intake/pushing still wakes balls. Two identical shots after reset produced zero trajectory difference in the focused test. Reset clears residual chassis forces/torques, and the shooting preset restores DEFAULT_SHOOTER. Prominent blue/red scored-ball counter is visible in fullscreen. Shot elevation remains relative to chassis pitch; a lower-looking shot on an incline is not evidence of random parameter changes.

Alliance correction: the displayed 2026 CAD has RED at negative X and BLUE at positive X. Score index 0 and outpost 0 are red; index 1 is blue. Practice labels and 2D/simplified visuals now match. Reference KitBot bumper material and 6740 plates are red. Imported robot appearance is preserved. Shooting at red hub uses the existing negative-X approach.
