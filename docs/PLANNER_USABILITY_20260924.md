# Autonomous planner correction — 24 September 2026

User reported that the proxy diagram was not the actual field, every waypoint stopped the robot, intake stopped travel, checkboxes consumed excessive space, and code export was unclear.

## Implemented

- Installed checksum-verified field CAD rendered in an orthographic top view, including its reference game-piece layout, directly beneath the editable route. Shared field rotations and exact dimensions align the overlay. A custom season with mismatched dimensions does not silently use unrelated CAD. This is the actual field asset, not a live practice game-piece simulation.
- Field-first layout, narrow waypoint editor, expandable full-screen planning workspace, collapsed advanced rules/imports/camera/recommendation sections. Checkbox styles explicitly override inherited full-width/min-height form rules: 18px and inline labels.
- One motion timeline drives evaluation, route ranking and playback. Continuous speed across ordinary waypoints; heading rotates during travel. Intake operates during the incoming leg; its entered duration sets a minimum collection travel time rather than a stationary wait. Shooting and explicitly selected waits stop. Start/end, literal reversal and zero-length rotation retain necessary stops. Corners are polyline approximations with reduced speed, not validated smooth drivetrain trajectories.
- Existing saved routes are recalculated with this corrected timeline. Intake on the first point or a zero-distance incoming leg is rejected visibly rather than inventing on-the-run collection. Inventory remains an assumed successful collection count, not simulated ball contacts.
- Code status explicitly states generation has NOT been implemented. JSON exports remain planning data. Actual robot repository/library/command mappings and generator/build validation are still required; no code download exists elsewhere. Do not say the only missing step is pressing a hidden button or claim JSON is robot code.

## Acceptance

TypeScript and production Vite build passed; existing bundle-size warnings remain. Expanded season-planning tests prove collinear waypoint insertion adds no stop, intake overlaps travel, heading changes in motion and shooting dwells. Existing collision, inventory, time-window, scoring, persistence and candidate tests pass. Simulator fidelity regression passes (504-ball conservation, opponents, replay, 32 tags, CAD checksums).

Browser checked actual field/balls aligned to the route, expanded planning view and checkbox dimensions (18×18px, row label). This does not prove physical trajectory feasibility or device acceptance. No database/backend/budget change is required.

Release identifiers are recorded after deployment. Previous production is f2c3f41 / 6TZsuSvJKCpKcmkNGTfH8unQ13oH.

## Production release

Website source `d380f71649f682626e63bbbf3547f6b73c4be902` (main implementation `4c2d20a`) is deployed as Vercel `3cqqGjoxw6HfLZWYREW4nhWeLtxL`, Ready/Production on g3-6740.com. Rebuilt with production environment. Authenticated cold reload verified the actual field CAD, expanded view, revised behavior labels, reviewed scoring policy and explicit code-generation status; no captured console errors. EN/HE labels checked locally. Previous source f2c3f41 remains the rollback target. No new APK or backend change.
