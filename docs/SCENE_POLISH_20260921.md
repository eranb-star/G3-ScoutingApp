**Superseded intake detail:** The later [driver-view and open-intake update](DRIVER_VIEWS_20260921.md) removes the solid tray and limits folded height. Scene/material improvements below remain.

# Intake attachment and Scene Polish (Step 3) — 2026-09-21

User authorized fixing the detached/transparent-looking reference intake and implementing Scene Polish. Local preview/implementation only; no push or production deployment.

## Changes

- Replaced unsupported floating arms with a reference-frame crossbar, rails, upright brackets, visible hinges/axle, opaque tray and rubber roller with an amber motion stripe. Mount coordinates are checked against the actual KitBot frame bounds. Roller endpoint follows configured capture reach; folded and deployed poses share the same attached pivot.
- The translucent plane was a diagnostic capture-volume guide, not intake material. It now appears only when intake, Software testing and geometry overlay are enabled. Imported models do not get an invented reference attachment; physical capture remains governed by existing configuration.
- Deterministic local procedural carpet texture, matte carpet response, rubber tires/belts and cloth-like bumper response, restrained neutral metal highlights. Clone only matched reference materials to avoid altering unrelated shared materials. Uploaded CAD retains its materials.
- Reduced washed-out exposure/environment intensity, balanced key/fill lighting with hemisphere aligned to Z-up. Lower shadow bias and tighter light frustum in robot/follow views improve nearby contact/detail; wide view retains broad coverage. Extended matte floor and distance fog soften the outer scene boundary.
- Robot close-up supports drag-to-orbit and zoom while tracking robot translation; follow smoothing is time-based. Quality presets, ball accounting and physical simulation rules are unchanged.

## Evidence

- test-scene-polish passes: actual GLB frame attachment intersection, roller endpoint across supported lengths/reaches, shared-material isolation, carpet mapping, deterministic texture.
- Existing quality and hopper visual regression scripts pass.
- TypeScript and production Vite build pass (existing bundle-size warning remains).
- Browser: inspected opaque intake folded/lowered in desktop fullscreen, dragged close-up to opposite side to inspect mounts, checked existing hopper and visible surface/shadow changes. Preview observed around 56–60 FPS after settling; initial resize/recompile transient was lower. No before/after benchmark or universal performance guarantee.
- No physics files modified in this increment. No new asset downloads, AI calls or database work.

## Limits / next session

The intake remains an illustrative reference mechanism, not validated robot CAD or an added collision mechanism. Scene polish is not physics calibration. Broad physical-device/performance acceptance (Step 4), fresh upload tests and production release integration remain separate. The handover must not say deployed. Preserve personal Android .idea edits and integrate into the known production baseline before any release, rather than deploying the accumulated main branch wholesale.

Preview: http://127.0.0.1:4213/ . Earlier scope/evidence: HOPPER_VISUALS_20260921.md and GRAPHICS_AB_20260921.md.
