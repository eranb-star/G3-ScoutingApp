# Field & Robot Studio implementation — 25 September 2026

The user approved the Figma proposal, requiring the real production CAD field and nearly full-viewport expansion. This supersedes the proposal-only status in FIGMA_STUDIO_UX_20260925.md.

## Delivered interface
- Plan route, Place cameras and Review coverage share the existing route, robot, mounts and playback. Switching modes preserves their state. No replacement simulation or invented Figma metrics.
- Existing verified field GLB and robot CAD remain the rendering/analysis inputs. Orthographic framing contains the field at different viewport ratios and matches the SVG overlay without stretching.
- Expand occupies the browser viewport; app chrome is covered, settings initially hidden, compact controls retained. Escape exits and restores focus. Background siblings are inert while expanded; previous inert/scroll state is restored on exit.
- Normal desktop uses a field and contextual inspector; mobile stacks them. Hebrew strings and logical CSS preserve RTL. Fullscreen mobile camera prioritizes the live viewport, with additional controls below it.
- Advanced rules, cloud/import and route alternatives remain in a collapsed workspace section. Code-generation status is retained; this does not implement the still-pending robot-repository-specific generator.
- Field survey action remains accessible with the results inspector closed. Existing sampled-visibility limitations remain explicit; no guarantee of zero blind zones or physical localization accuracy.

## Acceptance
TypeScript, season/planning regressions and CAD raycasting tests passed. Production build passed with existing large-chunk warnings. Browser at desktop and 390x844: real CAD loaded, a point added, heading changed to 90 degrees, shared playback ended at camera heading 90 degrees; mode changes preserve route; Escape restores page; mobile and Hebrew layouts inspected. Full survey was tested in the previous camera release and not rerun for this layout-only change. No physical phone/VR acceptance, DB migration, paid AI call or APK rebuild.

## Design fidelity and limits
Implements the approved field-first structure with existing native controls/system font. It is not a pixel copy of Figma's illustrative field or its sample readings. Camera viewport and coverage map are separate modes, not simultaneous multiple live video feeds. Portrait route view contains the entire wide field with letterboxing; landscape gives a larger useful field. Long settings/results scroll in their panels.

## Release
Implementation/release identifiers and production acceptance are recorded after release below. Previous production: 31d6d33 / Fxr2DFCLxK4QiPnipCzVHxkP3tGU. Preserve unrelated Android IDE edits. APK remains unchanged.
