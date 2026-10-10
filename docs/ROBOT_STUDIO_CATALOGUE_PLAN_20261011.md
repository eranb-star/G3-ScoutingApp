# Robot Studio catalogue and usability correction — 11 October 2026

Status: this is the acquisition/design register and initial audit. The [subsequent correction release](ROBOT_STUDIO_CATALOGUE_RELEASE_20261011.md) supersedes its initial implementation counts/status. User authorised implementation. Comprehensive component coverage remains incomplete; distinguish the 93 ready source-derived entries from unbundled product families below.

## Evidence and current baseline

Code: `apps/dashboard_web/src/lib/robotStudioCatalogue.ts` has exactly nine entries extracted from MIT-attributed 6328 Darwin geometry: drivebase, Kraken X60, Kraken X44, half-inch hex bearing, MK5 wheel, jack shaft, screw, 120A breaker and VH-109 radio. These are team-export representations, not manufacturer certification. There is no complete swerve module, roboRIO, PDH or Limelight entry. Eight configurable stock shapes exist. Do not confuse a wheel with a module or a radio with a robot controller.

`RobotStudioPage.tsx` hides the catalogue in a disclosure, foregrounds the example hopper and mass-only placeholder, and puts Remove low in the selected-part inspector. `RobotStudioCanvas.tsx` already uses TransformControls: improve discoverability and interaction rather than build a second transform engine. Save/revision calls require a persistence audit before separating recovery drafts from explicit checkpoints. Preserve existing revision references, proposals and access restrictions.

## Source register — inspected 11 October

| Source | Evidence found | Still required |
|---|---|---|
| [SDS MK4i](https://www.swervedrivespecialties.com/collections/mk4i-module-kits/products/mk4i-swerve-module) | Manufacturer lists separate Falcon and NEO STEP assemblies | Download/convert; exact configuration; source permission; dimensions; bundled contents |
| [REV PDH REV-11-1850](https://www.revrobotics.com/rev-11-1850/) | Manufacturer links PDH Onshape CAD | Export permission and pinned model; conversion and validation. The STEP/STL downloads beside it are the breaker extraction TOOL, not PDH |
| [Onshape FRC resources](https://www.onshape.com/en/education/first-robotics) | Official page links an FRC Parts Library | Enumerate actual contents and usage terms; no claim its entirety is importable |
| [WCP catalogue](https://wcproducts.com/collections/viewall) | Supplier discovery source | Product-by-product CAD and rights verification |
| [AndyMark mechanical](https://andymark.com/collections/mechanical-main-nav) | Supplier discovery source | Product-by-product verification; roboRIO source investigation |
| [CTRE catalogue](https://store.ctr-electronics.com/collections/all-products) | Supplier discovery source | Product CAD, exact variants and rights |
| [REV resources](https://www.revrobotics.com/resources/) | Supplier documentation index | Per-product CAD and specifications |
| [Limelight 3 guide](https://docs.limelightvision.io/docs/docs-limelight/getting-started/limelight-3) | Conversion enclosure CAD linked | This is not a complete camera model. Full device CAD unresolved; downloads route retrieval failed during audit |

No newly researched model has been downloaded, converted, licensed for redistribution or validated in this audit. A source link does not mean a component is ready.

## Concrete acquisition manifest

This is the target product/family register, not a claim of comprehensive verified SKU coverage. Expand commercial families into exact vendor variants before marking ready. `Existing` means current team-export catalogue; `CAD located` means provider link only; `Source pending` means acquisition/verification remains; `Generate` means our own dimensioned concept, not purchased hardware.

| Category | Product or family | State / necessary distinction |
|---|---|---|
| Frame | Configurable rectangular chassis | Generate; outside L/W, member section, frame height, material |
| Frame | Configurable belly pan | Generate; L/W/thickness/material; no automatic machining claim |
| Frame | 6328 Darwin drivebase | Existing; fixed geometry and source identity |
| Drive | SDS MK4i Falcon configuration | CAD located; ratio and revision must be pinned |
| Drive | SDS MK4i NEO configuration | CAD located; separate configuration |
| Drive | SDS MK4 / MK4n / MK5 families | Source pending; enumerate exact variants |
| Drive | REV MAXSwerve family | Source pending; complete assembly and motor inclusion |
| Drive | WCP swerve family | Source pending; enumerate exact product names/SKUs |
| Drive | Tank-drive chassis components | Source pending; no invented universal kit |
| Motor | Kraken X60 | Existing team export; manufacturer version/shaft verification pending |
| Motor | Kraken X44 | Existing team export; variant verification pending |
| Motor | NEO / NEO 550 / NEO Vortex | Source pending; separate physical models |
| Motor | Falcon 500 | Source pending; separate shaft/assembly identity |
| Motor | CIM / Mini CIM / BAG / 775pro | Source pending; legacy filter, no current legality claim |
| Control | roboRIO / roboRIO 2.0 | Source pending; two independent models |
| Power | REV PDH REV-11-1850 | CAD located in Onshape |
| Power | CTRE PDP | Source pending; distinct from PDH |
| Power | SPARK MAX / SPARK Flex | Source pending; distinct motor controllers |
| Power | Talon SRX / Victor SPX | Source pending; legacy filter |
| Power | VRM / RPM power modules | Source pending; identify exact vendor/version |
| Power | 120A main breaker | Existing team export; verify identity |
| Power | Branch breakers / fuse families | Source pending; dimensions and current-rating variants |
| Power | Robot batteries and restraints | Source pending; exact battery SKU, no universal mass |
| Network | VH-109 radio | Existing team export |
| Network | Legacy radio models | Source pending; history/demo filter |
| Network | CANivore / CAN distribution devices | Source pending; wiring is separate functionality |
| Vision | Limelight 2+ / 3 / 3G / 4 | Source pending; verify full device models individually |
| Vision | Camera / lens / coprocessor families | Source pending; exact product list required |
| Sensor | CANcoder / Pigeon 2 | Source pending |
| Sensor | REV Through Bore Encoder | Source pending |
| Sensor | Absolute encoders / distance sensors | Source pending; exact products required |
| Sensor | Limit switches / beam-break pairs | Source pending; identify receiver/emitter inclusion |
| Motion | Planetary / single-stage gearboxes | Source pending; ratios and motor adapters |
| Motion | Spur / bevel gears | Source pending; pitch/module, teeth, bore |
| Motion | Sprockets / chain | Source pending; chain standard, teeth and bore |
| Motion | Timing pulleys / belts | Source pending; pitch, width, teeth/length |
| Motion | Shafts / hubs / couplers / spacers | Existing limited stock shapes; extend verified families |
| Motion | Bearings / bearing blocks | Existing one bearing; source remaining variants |
| Wheel | SDS MK5 wheel | Existing; not a module |
| Wheel | Traction / omni / mecanum wheels | Source pending; diameter, width, bore and handedness |
| Mechanism | Compliant / shooter wheels and rollers | Source pending; exact product dimensions/durometer |
| Mechanism | Elevator rails / carriages / rigging | Source pending; stage dependencies |
| Mechanism | Linear slides / actuators | Source pending; travel envelope separate from solid |
| Pneumatic | Compressor / air storage / regulator | Source pending; exact units |
| Pneumatic | Cylinders / solenoids / manifolds | Source pending; bore/stroke/port variants |
| Pneumatic | Fittings / tubing | Source pending; size families, schematic routing separate |
| Stock | Aluminium tube / extrusion / angle | Extend dimensioned shapes; product hole patterns need sourced geometry |
| Stock | Acrylic / polycarbonate / aluminium sheet | Existing panel shapes; explicit material and density source |
| Stock | Carbon tube | Existing round tube; OD/ID/length, no guessed strength |
| Hardware | Screws / nuts / washers / rivets / inserts | Existing one screw; family generators or sourced geometry |
| Hardware | Brackets / gussets / standoffs | Source pending or clearly labelled generated concepts |
| Wiring | Connectors / terminals / cable | Source pending; gauge/connector family; no electrical validation claim |
| Team | Authorised private CAD and saved assemblies | Existing import/reuse; unified search must retain ACLs |

## Import acceptance per exact variant

Record stable ID, manufacturer, product number, variant, category/search aliases, source URL/revision/date, rights evidence, geometry hash, original units, transform, measured bounds, thumbnail, mass source or unknown, attachment references and included children. Store low-detail viewing geometry separately from the immutable original. Validate scale, orientation, normals, memory cost and mobile interaction. STEP needs conversion: current browser accepts bounded GLB/STL, not a STEP kernel. Do not pretend every CAD source is browser-ready.

Critical second-pass finding: SDS CAD includes motors whereas the kit excludes them. Catalogue assemblies must list included motors/encoders/hardware and suppress double counting when users add or replace children. Mass coverage and Robot Build quantities must use the same inclusion model. Part legality is season-specific and must not be inferred from catalogue inclusion.

## Implementation order and acceptance

1. Unified catalogue metadata/search UI: public/team/imported entries in one list with ACL filtering, thumbnails, source details and explicit unavailable state. Keep missing acquisition rows out of the selectable-ready count. Preserve old IDs so saved scenes reopen.
2. Start design: configurable concept chassis with optional belly pan, library chassis, import or empty. Optional templates secondary; Additional weight belongs in mass summary. No fake named manufacturer models.
3. Editor: visible Full screen and focus mode, collapsible panels, selection action bar Move/Rotate/Duplicate/Delete, axis and plane handles, exact mm/degrees, nudge, snapping, place-on-ground and alignment. Existing transforms/fullscreen must be inspected and reused. Delete affects scene instances only; children choices and Undo remain.
4. Persistence: separate autosaved recovery draft from explicit named versions. One drag equals one undo action. Unchanged save creates no duplicate. Preserve CAS/lease protection. Existing referenced revisions remain immutable; only unreferenced checkpoints can be deleted through authorised backend checks. Do not bulk-delete existing history. Resolve concurrent editing and offline recovery before release.
5. Populate catalogue in category batches after rights/geometry acceptance. Pin model revisions; never silently replace saved scene geometry with supplier updates. Large libraries require lazy loads, caching and disposal, not preloading every model.
6. End-to-end acceptance: create chassis/pan; add complete swerve and electronics; replace a bundled motor without duplicate weight; select/move/delete/undo; save/reopen; compare; fullscreen; present; propose to build without stock mutation. Repeat critical interaction at phone size and Hebrew RTL. Test revoked private CAD access and references to older saved versions. Match regression scope to changes.

## Remaining decisions handled by defaults

Use one library with source as metadata, mm/degrees internally in editing UX, visible source/geometry fidelity, unknown weight explicitly unknown. No new paid services, no robot GitHub writes, no Onshape modifications or new private disclosure. Catalogue downloads do not authorise redistribution automatically. Missing source rights block that asset only, not editor improvements or other approved assets.

## Release reporting

Report separate counts for product families, exact variants, ready 3D assets and unresolved sources. Do not count fastener size combinations as independently validated products. Do not say all FRC parts or all Phase 2 capabilities are delivered. This audit changes documentation only; no UI fix or catalogue expansion is yet deployed.
