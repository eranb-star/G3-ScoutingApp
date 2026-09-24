# Mounted-camera rotation and field survey — 25 September 2026

## Report and cause
User observed constant-facing mounted camera despite a route changing direction. Existing mount transform already added chassis heading, but all newly created waypoints defaulted to heading zero. A swerve path shape does not itself specify chassis heading. Camera route sampling also omitted intermediate orientations for zero-distance turns. Therefore visibility, oriented clearance, motion estimates and camera recommendations were evaluating configured headings, not the user's intended turns. This does not establish a failure in the separate manual-driving physics engine.

## Changes
- One shared mounted-camera transform for rendering and visibility, rotating both lens offset and optical direction with chassis heading.
- Camera route sampling includes shortest-angle turns, including in-place turns; bounded below 1,000 poses while retaining endpoints. CAD route analysis now uses all those samples instead of discarding them down to 81. Large routes have coarser sampling; no continuous-coverage guarantee.
- Explicit waypoint heading explanation and actions: Face next route point, Face field center, Set headings along route. Existing saved routes are not silently changed. Shooting direction remains an explicit robot/route choice; chassis heading and direction of translation remain independent.
- Camera pose source: route inspection slider, follow shared route playback, or independent field inspection. Chassis heading displayed. Independent X/Y/heading controls and clickable actual-field map do not alter saved routes.
- On-demand field survey: 12 x 6 cell centres, 8 headings each, configured permitted mounts, best bounded candidate combination. Red means all eight headings blind; amber means some headings blind; green means at least one geometrically visible tag at every sampled heading. Colour covers only the sampled centre, not the full cell or all angles. Includes potentially occupied/undrivable positions explicitly; not a collision certificate.
- Clickable first 48 blind samples for route and field, visible tag IDs per mount, cancellation, progress and result invalidation when relevant inputs change. Full counts/map include all samples. No paid AI calls or polling.
- CAD ray tests use a static mesh bounding-box hierarchy and short-circuit occlusion; unchanged visibility semantics tested against direct triangles. Detailed CAD survey can take minutes; cancellation yields between poses.

## Acceptance
TypeScript, season/planning and actual-CAD tests; shared transform tested at 90 degrees, rear-facing visibility, 180-degree stationary rotation, +/-180 wrap and bounded long routes. Hierarchy compared with direct raycasts across 120 rays. Production build retains existing large-chunk warnings.
Browser: independent heading 0 to 180 changed visible tag IDs and camera image while robot position remained unchanged. Full survey and release status recorded below after verification.

## Boundaries / next camera engineering work
This is a geometric model on a flat chassis with a selected fixed CAD mechanism pose. No ramp-induced pitch/roll, dynamic opponents, lens distortion, exposure/motion blur or empirical localization error model. Existing optics/minimum projected tag-size assumptions remain. KitBot analysis still excludes illustrative additions absent from original CAD. Green is not proof of localization accuracy or safety.
Candidate ranking chooses among permitted proposed mounts; it does not invent mounting locations, certify mechanical mounting, optimize every location on a robot, or train a model. For automatic mount search, constrain physically valid surfaces/height/clearance/wiring and compare alternatives against both route and field samples, mechanism poses and camera failure. For empirical learning, collect synchronized pose/detection logs, camera intrinsics/extrinsics, settings and exact robot/field revisions; validate held-out runs before using calibration corrections. Do not promise zero blind spots.

Previous production: 9cac90f / EFEivjaqgHeFGmxp134QQRW2aNce. No DB migration, permission expansion, APK or private repository access required.
