# Robot Studio catalogue and editing correction — 11 October 2026

Status: catalogue/editor correction deployed to production; final mobile-panel and new-design-mode refinement awaiting promotion. This is a substantial catalogue/workflow correction, **not** a claim that every FRC product or every item in the acquisition plan is complete.

## Delivered implementation

- One searchable library with category filtering, actual geometry thumbnails, source attribution and common-name matching (including PDH, swerve and roboRIO). Shared CAD remains subject to the existing database permissions; no new private access grants.
- **93 loadable source-derived entries**: 77 Darwin entries including the original nine, 12 KitBot entries, simplified roboRIO from Manta, and NEO / NEO 550 / simplified SPARK MAX from Banana Split. Assemblies, subassemblies and individual hardware are counted as entries, not 93 independent manufacturer product families. Geometry is pinned by checksums and existing catalogue IDs remain stable.
- Configurable rectangular concept chassis: outside length/width, rail height/width/wall, optional belly pan thickness. The frame consists of editable rails/pan under one assembly group. It does not imply drivetrain fit or machining approval.
- Catalogue drag/drop onto the ground plane; click-to-add remains available. Visible selection Delete/Duplicate/Focus, keyboard Delete, X/Y/Z nudge in world/local axes, ground placement, existing move/rotate handles, numeric editing, full screen and focus mode.
- Explicit **Save version** replaces the previous two-second server autosave. Undo/movement no longer produce server checkpoints. Unchanged saves are ignored. Local tab drafts retain recovery, including brand-new unsaved designs via a draft URL. Saved versions retain existing review/proposal references and concurrency protection.
- The hopper template is secondary, additional weight is beside the mass summary, and presentation-view editing is collapsed by default.
- External CAD discovery entries clearly say **import required** and are not counted as ready models. Limelight manufacturer STL was downloaded and inspected during research, but browser direct-fetch failed. It is not bundled or represented as a working one-click model. Manufacturer downloads can use the existing authorised GLB/STL import; STEP requires Onshape conversion.

## Verification

- Focused studio domain/geometry test passed, including actual generated frame bounds, hollow members, invalid dimensions and world-axis nudging under a rotated parent.
- All 93 catalogue entries loaded with nonempty finite bounds and centred origins; independent clones and six-source caching passed. Common-name search checks passed.
- TypeScript and Vite build passed before final documentation. Required CI remains intact and now includes the catalogue test.
- Browser synthetic acceptance: generated frame/pan visually inspected; NEO and PDH loaded; ground placement, Delete/Undo and explicit v1/v2/v3 saving verified; fullscreen retained editing controls. Recovery of a new unsaved draft observed. Synthetic storage is not production persistence evidence.
- Production acceptance: created configurable chassis/pan plus actual simplified roboRIO, moved it, saved version 1 and reloaded it successfully at `?design=403a9b9c-4a1c-416f-8c0f-b4471fb1d02e`. No inventory or manufacturing records were created.
- Production release `7253556` (development `818f606`), Vercel `6Xmsnp9ncYM2C6JLXBLBnvBBozpU`, Ready 11 October 2026 02:54:46 GMT+3; g3-6740.com alias confirmed. CI365/366 passed. Earlier implementation commits: development `edc9131`, release `0981ff7`.
- Mobile acceptance found that the open bottom drawer obscured header actions and Assist overlapped its navigation. Final refinement adds a visible close button, removes the floating Assist shortcut only inside phone Studio (main navigation remains), and resets new designs to Design mode. Focused TypeScript check and Compare → new design check passed; final release identifiers follow after promotion.

## Explicit remaining boundaries

The full sourcing register remains in [the catalogue plan](ROBOT_STUDIO_CATALOGUE_PLAN_20261011.md). Missing ready models include Limelight, CANivore/CAN distribution devices, CANcoder, Pigeon, exact roboRIO 2.0, MAXSwerve, further motor/controller variants, pneumatics and many supplier SKUs. Public download links alone do not establish redistribution permission. Simplified team CAD is labelled and must not be called manufacturer-certified.

Automatic recognition/removal of motors already included inside a source assembly, exhaustive BOM/mass inclusion, named checkpoint metadata, deletion of unreferenced server versions, favourites/recent parts, and measured large-scene phone performance are not delivered in this correction. Existing source-component extraction and mass coverage indicators remain; users must inspect assembly contents before adding duplicate hardware. Unknown mass stays unknown. History clutter is prevented for new edits, but old review-linked versions are preserved.

No database migration, Onshape modification, robot deployment, APK build, paid service or GitHub robot-repository write permission is part of this release. Rollback is the prior frontend release f7472a3; keep additive catalogue scene data and restore the newer frontend to reopen new catalogue IDs.
