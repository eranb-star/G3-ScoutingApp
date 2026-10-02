# Simulator training and autonomous robustness — 2 October 2026

## Scope and release status
User authorized improving existing simulator training, autonomous robustness, alliance behavior and Studio UX. This extends delivered VR, CAD, cameras, match rehearsal, replay and Java scaffold; it does not rebuild those foundations. Production Ready at https://g3-6740.com: deployment `3SC96qomfb5Rj5FGFh4HEMe2FEkj`, source `7d67507940ce3df5440078aaf6017095d43a7b4b`. Main implementation `b739d11`, contrast follow-up `f268254`; release equivalents `d23df59` / `7d67507`. Initial feature deployment `JA1pEWhxbdsevjBbHRqj3LAangMs` was superseded by the hover contrast correction. Both branches pushed. Authenticated production mission/task list and actual full-screen CAD verified; no browser console errors observed.

## Delivered increment
- Practice mission target, shareable exercise/target/format/alliance link, existing Work task association, immutable shared simulated trial record and coach feedback through Work. Local history/replay remain. One mission is one attempt; partial runs cannot pass. Sharing retries reuse the run ID. Shared comparisons require identical simulation settings. No automatic physical qualification.
- Eight repeatable route sensitivity cases: nominal, slower movement, longer actions, four translated paths, combined stress. Inputs bounded; uses existing clearance and timing evaluator. Results show timing margin and reasons, not a probability or hardware reliability claim.
- Red/Blue rotates authored routes, headings, saved candidates and partner reservations by 180 degrees. Camera mounts stay robot-relative; tag IDs/poses and real field remain fixed. Java scaffold explicitly states displayed alliance coordinates must not be flipped twice. Imported saved workspaces normalize to selected alliance. Side preference persists locally.
- Physical robot start/reset and example approaches follow alliance. Computer opponent changes to opposite side, with symmetric controller coordinates. Keyboard movement remains field-relative. Historical season geometry is not newly made playable.
- Route toolbar controls align at baseline; practice review text/counts wrap; toolbar wraps across views. Removed redundant nested Workspace-tools accordion. Plan/test/save section gives tools context. Outer Robot & display settings is normal entry; in-field View settings only appears in full-screen where outer controls are hidden. Engineering settings remain reachable.
- Knowledge link renamed Field rules & references; opens sources for selected season. Knowledge source view now honors bounded season URL parameter.

## Student / leader flow
Leader selects Practice, exercise, target, alliance and format; copies link into existing Work task. For full-match AUTO share the Engineering workspace separately; mission URL does not serialize robot settings, custom CAD or route. Students agree matching settings, run, review, record one next change, optionally link task and share result. Open shared result in Robot test records; coach feedback remains in Work. There is no second assignment or grading system.
Engineering: plan route → inspect camera coverage as needed → test route robustness → revise → save/export → rehearse full-match AUTO. Java output remains a scaffold requiring the team's repository adapter and robot testing.

## Validation
Passed: TypeScript, production Vite build; simulator-training tests (half-turn/inverse, fixed tags, code alliance, deterministic perturbations, mission boundaries, identical-setting comparisons, opposite-side AI); isolated PostgreSQL repeatable protocol migration and physical-mislabel rejection; existing team-learning permission/immutable-evidence suite; season-planning, studio-match/Java compilation, practice-progress, practice-venue, twin-VR, physical-drive, fuel-intake and shooting suites.
Browser: actual CAD rendered; blue start x/y/headings confirmed; eight robustness cards; completed 60-second local no-input run correctly fails target; expanded field, baseline controls and responsive Hebrew inspection. Mission URL restored full-match format, collection target 15 and blue alliance; saved side persisted on reload. Live shared-history insertion was not exercised with fabricated student data. Physical headset and phone device acceptance not performed; viewport checks are not hardware certification.

## Database / compatibility
Applied `backend/supabase/simulator_training_20261002.sql` to production hnqwhuuxlqfyawqymaaz successfully on 2 October. Adds driver protocol and enforces simulated evidence for it. Existing RLS, immutable history and permissions unchanged. No fabricated production student result inserted. Old web build remains compatible with additive protocol, though old clients do not label new driver records correctly.
APK remains 2.2.0 / code 24; no new APK built in this increment.

## Important boundaries and remaining work
- Sensitivity checks are not Monte Carlo probability, drivetrain closed-loop validation or measured localization uncertainty. Calibrate using real logs/robot measurements when available.
- Local legacy workspaces without alliance metadata are interpreted as red; inspect before using on blue. New workspaces record alliance.
- Mission links are bounded setup links, not full robot/route packages. Shared run snapshots preserve complete settings; recorded physics replay remains local.
- Opponent is practice AI, not real published-team code. Match rehearsal still fuel-only, with existing declared simplifications (not tower/fouls/all official interactions).
- Field/tag survey, camera calibration and repo-ready autonomous code need actual robot inputs. CAD mentor remains a distinct next increment: geometric fit/clearance/serviceability first, sourced constraints and explicit unknowns; not certified structural/electrical correctness from a visual mesh.
- Team-building/software/simulator priorities precede pit polish per user's latest preference. Existing Academy, Knowledge, Check now, VR and trial foundations are delivered; do not re-propose them as missing. Continue with CAD mentor or private-repository software integration when inputs available, then measured autonomous/vision validation. Alliance planning and pit polish remain later.

## Rollback
Previous production deployment CUSBK5AWY7JAB9c83uiQdgFDKsrw (source 0c1d06a). Roll back web if needed; retain additive database protocol to preserve any saved driver records. Do not drop rows or change physical evidence labels.
