# Field & Robot Studio — Figma review proposal

File: https://www.figma.com/design/mPHuOLWnGfvXy02TYpHd9s

Status: design proposal only, awaiting user review. No application or production changes.

## Created screens
- `5:129`: desktop Plan route.
- `5:310`: desktop Place cameras.
- `5:473`: desktop Review coverage.
- `6:101`: mobile coverage layout.
- `6:279`: interaction requirements and acceptance notes.

Desktop mode tabs and Next/Adjust actions have nine navigation links. Figma controls do not execute simulation, field picking, saving, numeric edits or surveys. Field drawings, camera preview and metrics are illustrative; retain the existing verified CAD, camera rendering and real computation when implementing. Do not replace production geometry with these drawings.

Proposal: field-first workspace, compact contextual inspector, shared route/robot/camera state, visible rotation heading, progressive advanced settings and mobile contextual panel. Inter is a proposed consistent typography choice; the existing app uses system fonts. Reuses Simple Design System button instances. It is not a complete G3 token/component library.

Screens were rendered and visually inspected; top-level content bounds checked, Inter text family verified, nine navigation reactions read back. Prototype has not been accepted by the user. Hebrew RTL, all interaction states, live CAD integration, actual-device behavior and performance must be validated during implementation. Loading/empty/error/stale-result behavior is specified in notes, not implemented or fully mocked as separate screens.

User expectation: once authorized, continue through the concrete review artifact; do not stop after creating a blank file or repeatedly ask to proceed. Account connection and file tools now work. No more installation instructions are needed.
