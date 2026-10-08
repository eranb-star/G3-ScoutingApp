# CAD fidelity audit — 8 October 2026

Status: source audit completed; native same-revision visual comparison blocked by Onshape browser sign-in. This is an implementation/acceptance specification, NOT a completed fidelity release. Production remains the previously documented release.

## Required outcome

The user requires the team's actual Onshape design to remain recognizable and complete in CAD Mentor, across sketches, Part Studios and assemblies. Do not substitute illustrative geometry, call successful tessellation full fidelity, or fix only the reported master sketch. Keep editing in Onshape and bind every inspection/review to its document, element, configuration and immutable microversion.

## Verified findings from current source

Sources: src/components/CadDesignViewer.tsx under apps/dashboard_web and geometry.ts, snapshot.ts, review.ts under backend/supabase/functions/onshape-connector.

1. Sketch rendering retains coordinate polylines but discards entity identity and construction/display semantics. Dimensions and constraint annotations are not rendered. All lines share a solid cyan style. A flat sketch is not necessarily erroneous, but its current rendering cannot establish equivalence to the native sketch view.
2. Camera fitting includes every imported line. Long references can shrink the useful mechanism. Face-on selection only recognizes global axis-aligned planes; arbitrary planes fall back to an oblique perspective view. Isolating a sketch still uses whole-model dimensions to decide orientation. There is no explicit sketch-plane/standard-view control.
3. Part surfaces are tessellations with recomputed normals and application-generated colors. Native appearance, edges and visibility are not preserved. This is not the native Onshape display state or exact B-rep representation.
4. Only the first 30 unsuppressed sketches are attempted, without reporting the rest as omitted. Parts without partId or with empty tessellation can disappear without a completeness report. A result with any mesh is labelled solid-geometry even when sketch imports failed.
5. Assembly occurrences are transformed and referenced parts fetched at pinned microversions. Parent instance suppression is not explicitly tracked across the occurrence path. Unsupported instance types are skipped. Native visibility/display states and motion are absent. Nonempty real assembly acceptance was not recorded in the original release.
6. Hard limits are 60 distinct parts, 1,000 placements and 30 MB geometry assets. Large designs need a bounded loading strategy and explicit coverage, not silent omission or a claim of complete robot support.
7. Snapshot collection obtains features/parts or assembly structure. Although review.ts can consume bounds/mass, snapshot.ts does not request them. Do not claim mass, center of gravity, fit, interference, motion or structural validation is implemented.
8. Gemini receives bounded structured evidence (42 KB / 100 citation records), not the displayed mesh or native CAD view. Large assembly evidence can exceed the budget as one record. Truncation is flagged, but complete geometry review is not provided. Visual rendering and AI analysis must have separate coverage reports.

## Implementation sequence and acceptance gates

1. Establish native references: same revision/configuration for master sketch, rake Part Studio, a solid part and a nonempty nested assembly. Record native visibility, sketch plane, expected entities/parts/placements and screenshots. Do not compare moving workspace content to an old imported revision.
2. Preserve source identity and coverage: retain entity/part/occurrence IDs; account for every requested, rendered, suppressed, unavailable and unsupported item. Treat unknown construction classification as unknown; never infer construction solely from line length. Replace silent sketch cap with explicit bounded loading/coverage. Version geometry cache after schema changes.
3. Correct sketch inspection: orthographic face-on view derived from the selected sketch's actual plane, fit selection, fit all, standard views and clear sketch/solid visibility controls. Render construction distinctions only from verified provider metadata. Preserve original coordinates; do not delete long references merely to improve framing. Dimensions/constraints need source-backed annotations or an explicit native-view route, not reconstructed guesses.
4. Correct parts/assemblies: verify transform conventions with rotated/translated nested instances; handle ancestor suppression; report unsupported bodies; preserve available appearance and hierarchy; implement bounded loading for larger designs. Distinguish source visibility from an optional show-all inspection mode.
5. Connect analysis to inspection: a finding should identify its revision and selectable source feature/part. Disclose exactly which evidence was reviewed and omitted. Use targeted retrieval/chunking for large assemblies. Geometry-based checks require actual geometric computation with tolerances and input provenance; an LLM suggestion is not a solved interference/strength result.
6. Acceptance: automated fixtures for arbitrary sketch planes, multiple sketches, long construction lines, empty/unsupported geometry, >30 sketches, nested suppression, repeated rotated instances, nondefault configuration and partial failures. Browser checks for master sketch/rake/solid/nested assembly, selection, isolation, fullscreen, mobile and EN/HE. Verify native comparison at the same revision before release. Preserve OAuth permissions, immutable review history, refresh/draft protection and AI consent/budget behavior.

## Exact-native-view boundary

The existing custom viewer cannot promise the exact Onshape editor, constraint solver, dimensions, display state or feature editing experience. Investigate supported native integration; do not assume a private iframe is supported or weaken sharing/authentication to make it work. An authenticated link to the exact source revision is authoritative but does not by itself satisfy the requested in-app inspection improvements.

## Current blocker

Opening the native master sketch on 8 October redirects to Onshape sign-in. Backend OAuth working does not sign the browser into Onshape. User has been asked to sign in; no credentials were read or changed. No new Gemini review or production deployment was performed for this audit.
