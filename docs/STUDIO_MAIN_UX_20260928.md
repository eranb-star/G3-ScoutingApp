# Main Studio UX redesign — 28 September 2026

Status: browser design prototype, not production. User requested Figma redesign of the confusing outer Field & Robot Studio, following the engineering-only redesign. Figma read/edit tools hit the connected Starter MCP limit before any canvas mutation. Existing file is unchanged. Do not claim this proposal was saved in Figma or shipped.

## Proposed flow
- Compact shared season/robot context; real field immediately visible.
- Drive: start/stop, intake, shoot, inventory and camera view. One button scale; magenta is primary/selected, red is stop, neutral is secondary. Disabled state is distinct.
- Practice: drill selection → countdown → run → results/replay. Reuse current drills, recording, saved practice review and metrics; no new invented results.
- Engineering: reuse delivered route/camera/coverage workspace. Stop manual driving before changing activity; preserve configurations and saved plans.
- Robot & display settings: dimensions, shooter lanes, intake/capacity, uploaded CAD, controller configuration, graphics, environment, diagnostics and model sources. Software testing belongs under diagnostics, not as the first driving action.
- Expand removes outer navigation and inspector; keep start/stop and mechanism controls. Driver-station camera must preserve sightlines. Mobile requires visible touch driving controls and landscape support in implementation; prototype only demonstrates layout, not complete touch control acceptance.

## Concrete review artifact
`apps/dashboard_web/scripts/designs/studio-review.html` wraps the existing local FieldTwinPage harness. Start/Stop, intake/shoot, robot selection, camera, graphics/environment and quick starting positions relay to existing controls. Practice/Engineering panels and advanced setting descriptions are design proposals, not implemented workflows. No production simulator source changed. Existing system font stack retained.

Run the existing `scripts/preview-field-twin.mjs` with PORT=4252 from apps/dashboard_web, then open `http://127.0.0.1:4252/@fs/C:/Users/user/Documents/GitHub/G3-ScoutingApp/apps/dashboard_web/scripts/designs/studio-review.html` (adjust absolute checkout path on another machine). Current running temporary harness has no capture script; pending unused Figma capture ID was never submitted.

Screenshot: `docs/design/studio-20260928/desktop.png`. Desktop composition inspected; Start/Stop verified against simulator state, expanded field/controls bounds checked. Narrow layout inspected during initial rendering; complete mobile/touch, keyboard focus, RTL and all modes need implementation acceptance. This DOM-relay prototype is for review only; production must use shared React state and existing simulation APIs, not iframe DOM manipulation.

Next: review this design direction, then implement the full main-page flow with preserved behavior and actual production viewport checks. Transfer the proposal to Figma when tool access is restored if still requested. Do not require an upgrade as a prerequisite to improving the app.
