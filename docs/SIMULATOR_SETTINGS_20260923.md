# Simulator settings and parallel shooters — 2026-09-23

## Requested behavior

- Numeric robot fields accept keyboard replacement and decimal entry. Draft text commits on Enter or blur; invalid/empty/out-of-range values revert to the last valid value. Capacity requires whole numbers and cannot fall below stored inventory. Escape restores the current value. Existing drive/recording locks remain.
- Shooting offers Single, Double and Triple. Rate means firing cycles per second: triple at 2 cycles/s launches up to 6 balls/s, in simultaneous three-ball volleys. One cooldown per volley; the final volley may contain fewer balls. Shot/results counts remain balls, not volleys. Each ball retains its identity and scoring ownership.
- KitBot default capacity 40, single shooter. Darwin default capacity 60, triple shooter, rear outlet. Player, computer and hopper display use these defaults. Reset retains eight starting preloads; capacity is not initial inventory. Model selection resets the profile; the shooting practice preset restores the selected model's shooter.
- These are user-selected practice parameters, not independently measured 6328 specifications. The 0.17 m parallel outlet spacing is approximate; CAD meshes are unchanged.

## Validation

TypeScript and isolated production build passed. Shooting regression covers 1/2/3 lanes, front/rear firing, same-tick launch, separated balls, cooldown, partial final volley and unique ball conservation. Intake, hopper, fidelity/opponent, practice/replay and telemetry tests passed. Browser checks confirmed typed 12.3 launch speed, 40 capacity, 0.35 reach, invalid 100 capacity reverting to 40, and Darwin 60/triple selection. Physical headset/phone acceptance and hardware calibration remain open. No APK, database or paid-AI changes.

## Release

Implementation `48c1bbd`; production candidate `875ea52`. Production deployment `A3xNMsgF3tGt7THHoGoxsiTKL1T8` is Ready / Production, aliased to g3-6740.com. Authenticated production smoke verified typed 12.3 launch speed, KitBot 8/40, Darwin 8/60 with Triple selected, then eight launched balls and 0/60 remaining; no browser console errors. Rollback: prior fidelity production `2t2Bh17M3CMKA24JmLapC4j6vyZY`, source `b65e929`.
