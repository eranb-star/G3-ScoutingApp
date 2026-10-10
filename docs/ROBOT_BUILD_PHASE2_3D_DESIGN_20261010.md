# Phase 2 — 3D Robot Studio: review design

Status: approved for end-to-end implementation by the user on 10 October 2026. Implementation is deployed; see ROBOT_BUILD_PHASE2_IMPLEMENTATION_20261010.md for exact release, software acceptance and physical/device limitations. Phase 1 remains included. Publishing private CAD or expanding access still requires the applicable explicit grant.

## 1. Product outcome

Students and leaders can compose, explain and compare a robot using published team assemblies, their own Onshape CAD, manufacturer parts and dimensioned stock shapes. They can begin without a chassis or production project. The result is a saved, interactive 3D concept with traceable sources, explicit engineering limits and an optional reviewed handoff to Robot Build.

The reference journey is: choose a published chassis → construct an acrylic hopper from panels → add carbon tubes, shooter wheels, shafts and motors → align the assemblies → demonstrate configured motion → compare alternatives → present → propose the chosen requirements to an existing build. A convincing animation must never imply physical validation.

## 2. Existing foundation and new work

| Existing capability | Reuse | New Phase 2 work |
|---|---|---|
| CAD Mentor geometry viewer | Three.js, camera controls, part selection/isolation, sketches, geometry coverage | Editable scene, placement tools, configurable solids, connectors, joint demonstrations |
| Onshape connector and snapshots | Read-only access, immutable source identity, team access restrictions | Reusable component definitions, import manifests, geometry conversion/cache and update comparison |
| Robot Build Phase 1 | Build identity, assemblies, requirements, quantities, sourcing, manufacturing and reviews | Reviewed scene-to-requirement mapping; no parallel inventory or manufacturing system |
| Inventory | Existing item identity and available stock | Optional verified catalogue link; demand/availability display without reservation |
| G3 Assist/CAD Mentor reviews | Existing evidence and access/budget controls | Optional selected-scene context, with provenance and explicit evidence scope |
| Field & Robot Studio | Existing field simulation and saved-plan references | A future explicit adapter; placing a model does not provide a calibrated simulation model |

Current viewer meshes carry positions and occurrence transforms; they are not a CAD feature tree, mate solver or editable solid-model kernel. A new editor should reuse proven geometry utilities, not replace the read-only viewer and risk its behavior.

## 3. Navigation and modes

Proposed user-facing name: **3D Robot Studio**. Current code exposes Robot Build through Work; it is not currently a direct sidebar destination. Add **Robot Build** to the main menu. Its landing page has two clearly visible destinations: **Team builds** (the existing operational workspace) and **3D Robot Studio** (concepts and demonstrations). Keep the existing compact Work shortcut to Robot Build. Do not add a separate sidebar item for the studio.

Canonical entry: **Main menu → Robot Build → 3D Robot Studio**. No project selection is required. Inside a selected build, provide **3D Robot Studio** after Assemblies & parts, opening designs linked to that build with **Create linked design** available. Use the same name everywhere instead of switching between Studio and Layout. Always allow switching back to independent designs; automatic project selection must not hide the studio entry. Preserve existing Robot Build deep links and permissions.

CAD Mentor remains the source-design review destination, reached contextually through **Review source CAD** on an imported component. Field & robot twin remains the field-driving/simulation destination. Neither becomes the parent of the new editor. Studio subtitle: **Compose robots, compare layouts and present ideas**; this distinguishes its purpose from field simulation.

Landing choices: **New demo**, **Open saved design**, **Start from a team build**. New demo asks only for a name and a starting point: team CAD, published model, starter chassis, or empty scene. Season, owner and other metadata can be completed later; a physical robot registration is not required.

Studio modes: **Design**, **Compare**, **Present**. Review comments belong to the selected design/version rather than a separate navigation area. The header always identifies Demo or Linked build, design name, active alternative, save state and sharing scope.

An unconfigured starter chassis is a dimensioned concept envelope, visibly labeled as such. A named purchased chassis has fixed verified variants. A configured envelope must not be described as a buildable drivetrain.

## 4. Desktop screen and visual hierarchy

```text
Back to Robot Build | Demo: Offseason concept | Option A | Saved
Design   Compare   Present                         Share   Version history
--------------------------------------------------------------------------
Parts / Assembly tree |              3D canvas             | Selected item
Search / Add          |                                    | Identity
Team CAD              |  orbit, select, move, rotate        | Dimensions
Published models      |  orientation cube and scale         | Placement
Manufacturer parts    |                                    | Attachments
Stock shapes          |                                    | Material/mass
Saved assemblies      |                                    | Source/version
--------------------------------------------------------------------------
Undo  Redo | Fit  Isolate  Measure | Checks: 2 need review | Parts summary
```

The canvas occupies most of the screen. The parts library opens when adding; the assembly tree is the normal left panel. The right inspector appears only for the selected item. Advanced fields are secondary disclosures, not a wall of dropdowns. Use the G3 plum/pink theme for selection and primary actions, a neutral dark canvas and restrained status colors with text/icons. Real materials retain their identity: acrylic can be transparent and carbon can have a visual finish, but a texture is not material certification.

Selection must be consistent between tree, canvas, properties, comments and checks. Double-click focuses an assembly. Breadcrumbs show Robot → Hopper → Left panel. Escape exits a tool before clearing selection. Enter confirms a placement; Escape cancels it. An always-visible help action explains mouse/touch controls. Destructive scene edits support undo.

Present mode removes editing panels and exposes next/previous saved views, assembly isolation and configured motion controls. Source/accuracy information remains accessible in one click. No fake metrics, decorative gauges or animation unrelated to the mechanism.

## 5. Parts library and mixed sources

The library distinguishes a reusable **definition**, its immutable **version**, and each placed **instance**. Four bolts may share geometry but have four identities and placements. A source assembly can be added intact, or the user can explicitly extract selected subassemblies. Its internal hierarchy and occurrence identifiers are retained.

Each entry records name, manufacturer/team, part number where known, category, variant, geometry source/version, units, dimensions, preview, source URL, reuse/attribution information, audience, mass provenance and available connectors/joints. Show separate facts: geometry available, dimensions checked, mass known, mounting references checked. Do not give the whole component one ambiguous green 'verified' badge.

Three distinct types:
- **Catalogue component:** fixed geometry and named variants. No arbitrary stretching of a Kraken, bearing, wheel or roboRIO.
- **Custom stock shape:** geometry generated from user dimensions; parameters editable and saved.
- **Imported CAD:** fixed source snapshot, positioned without editing its engineering geometry. Custom source modifications remain in Onshape.

First-release catalogue target is a representative set, not all FRC parts: one reusable published chassis/subassembly with suitable reuse terms; one team-owned mechanism; examples of motor, controller, bearing, shaft, wheel, battery and mounting hardware. Exact entries are selected after checking geometry availability, variants and reuse conditions. Missing items have an obvious **Import your part** route.

Catalogue browsing includes desired components even if the team owns none. Availability is a separate inventory badge; absence in inventory does not prevent a demo. Matching uses explicit part number/variant or reviewed mapping, not a name-only automatic guess.

## 6. Imports and geometry fidelity

Initial supported import paths: existing Onshape snapshots through the connector, plus uploaded GLB and STL with declared units. For STEP or native CAD, the initial supported route is import into Onshape and then connect it; direct browser STEP conversion is not promised. File conversion support must be published explicitly in the UI.

Import sequence: choose source/assembly/variant → preview hierarchy and units → identify ground/up/forward → review coverage and source terms → add. Preserve the original asset; normalize once into canonical metres, right-handed coordinates, +Z up, +X forward, +Y left. Display mm/inches independently of storage. STL has no reliable unit declaration, so require confirmation against a known dimension. Named catalogue assets use verified dimensions rather than asking each student.

Onshape occurrence transforms are absolute relative to the top assembly. Convert them to editor-local parent transforms once; do not apply ancestor transforms a second time. Keep original occurrence paths and source configuration. Distinguish geometry already transformed by an exporter from local geometry. Test nested, rotated and repeated instances.

Import statuses: queued, processing, ready, partial, failed, access unavailable. Partial imports identify missing parts, sketches, suppressed geometry and unsupported content. A planar sketch stays planar. Never substitute a box silently; an explicit placeholder is allowed with 'dimensions only' status and excluded from geometry-based checks.

Published models require source/attribution and intended-use review before shared-library publication. Public visibility alone is not redistribution permission. If reuse is unclear, retain a source link or obtain permission; do not publish the geometry in the team catalogue by default. External references and oversized/malformed files are validated server-side; arbitrary remote URLs are not fetched by an unrestricted proxy.

## 7. Configurable construction parts

| Family | Editable parameters | Validation |
|---|---|---|
| Rectangular panel/plate | Width, height, thickness, material, appearance | All positive, explicit units |
| Trapezoidal panel | Height, top/bottom widths, top offset, thickness, material | Nondegenerate polygon, positive thickness |
| Round tube | Length, outside diameter, wall thickness OR inside diameter | 0 < inside < outside; derived field read-only |
| Rectangular tube | Width, height, length, wall thickness | Interior dimensions positive |
| Rod/shaft | Length, diameter or across-flats for supported hex stock | Clear size convention and positive dimensions |
| Spacer | Length, outside/inside diameter | Bore smaller than outside diameter |
| Simple angle stock | Leg lengths, thickness, length | Valid cross-section; explicitly approximate corner geometry |

Starter set includes acrylic/polycarbonate/aluminium panels and carbon/aluminium tubes as selectable materials; density values need a recorded source or explicit user estimate. Named purchasable stock sizes are optional presets; arbitrary dimensions remain 'custom size, sourcing unverified'. Radius and diameter are labeled, never interchangeable hidden inputs.

The hopper journey: create bottom panel → duplicate for sides → change side profiles → position and set panel angles → group as Hopper → save as reusable assembly. Provide dimensioned hopper example templates, but users can change each panel independently. Overlap checks can highlight panels occupying the same space; the system does not silently design seams, brackets, bend allowances or fasteners.

Editing a duplicated custom part defaults to **This part only**, creating a new definition version/reference for that instance. **All linked copies** requires an explicit affected-instance preview and confirmation. Saved alternatives and other scenes remain unchanged. A hopper group has no arbitrary scale handle: edit individual panels; any future whole-hopper dimension control must define and preview the generated panel changes. This prevents a side-panel edit from unexpectedly changing the bottom or another design.

Complex sketches, arbitrary cutouts, Boolean solid editing, threads, sheet bending and manufacturing drawings remain Onshape work. Simple holes are a later bounded addition, not a hidden promise in the first release. No DXF/STEP manufacturing export from an approximate scene.

## 8. Placement, attachments and editing

Add by drag/drop or **Add → click/tap a placement surface**. Show a translucent preview, current reference plane and coordinates before confirmation. Empty-space placement uses an explicit construction plane, never an unexplained depth inferred from the mouse.

Support move/rotate handles, world/local axes, numeric position/rotation, grid increments, face/axis alignment, duplicate, multi-select, group/ungroup, lock and hide. Ground/lock the chosen base. Reparenting preserves world pose. Hiding changes visibility only; removing from the active alternative changes demand. Duplicating an assembly duplicates its instances, not its underlying asset file.

Attachments use explicit component-local references: point/frame, axis, planar contact and optional mounting pattern. User-created references are labeled 'user defined'. Aligning visual faces is distinct from verifying bolt patterns. Full automatic CAD mating is excluded. Supported persistent relationships are rigid attachment and the simple joints in section 10; cycles and conflicting relationships are rejected with an explanation.

Unattached parts are allowed during exploration but appear in a **Connections to resolve** list. Users can mark **Adapter/bracket needed** with a note between two components; this is an unresolved requirement, not invented geometry or a completed connection. Imported assemblies remain rigid by default. Explicitly rearranging their children creates a layout override, retains original source poses, and labels the result as modified from the source assembly.

Changing a tube diameter regenerates geometry and marks affected attachments for review. Do not leave an old bearing connection appearing verified. Catalogue variant swaps preview changed envelope, connector and mass data. Imported components cannot be mirrored into a supposedly purchasable handed variant; custom shapes can be mirrored as a new custom definition where supported.

Deletion and replacement preview dependent children, attachments, joints, comments and presentation steps. Never silently delete attached mechanisms: offer cancel, remove the selected subtree, or preserve children in their world poses with unresolved connections. Treat the operation as one undoable transaction. Replacing a component or accepting a source update requires mapping old references to new ones; unmatched references become unresolved. Measured mass overrides and prior connection acknowledgements are not automatically valid for a different variant.

## 9. Checks, mass and estimates

Checks panel groups actionable findings: missing geometry, unknown mass, missing attachments, incompatible known dimensions and possible clashes. Selecting a finding focuses both components and explains the method. Findings can be acknowledged with a reason; acknowledgement is not correction or certification.

Every calculated result is tied to the scene revision, active alternative, relevant pose and check method/version. After a relevant edit, show **Needs recalculation** or **Checking**, never the previous green result as current. Discard late results from superseded calculations. Acknowledgements apply only to the reviewed geometry/context and reopen when it changes. Presentation snapshots retain their own dated results; build proposals explicitly identify stale or missing checks without confusing conceptual acceptance with manufacturing approval.

Keep **design readiness** separate from **presentation readiness**. A scene can be saved and presented with unresolved engineering findings; those remain accessible. Missing required assets prevent an unqualified 'presentation ready' state. Do not gate ordinary exploration behind completion of all checks or put a universal 'robot ready' badge on the scene.

Bounding boxes provide broad screening only. Mesh-level overlap/nearest-distance checks use a stated tessellation tolerance and report approximate geometry results. Intentional contacts can be marked with reasons; they remain visible in history. Thin surfaces, open meshes and incomplete models must report unsupported/uncertain results rather than 'clear'. Fasteners, cables, tool access and load deformation are not assumed modeled.

Mass priority for each instance: reviewed measured value → applicable manufacturer value → provider mass with known material/override provenance → valid volume × recorded density estimate → unknown. Show source and override history. Mesh volume is usable only for suitable closed geometry; never use a bounding box volume as solid mass. Purchased assembly aggregate mass and child masses are mutually exclusive counting strategies.

Calculate known mass and mass-data coverage by counted instance; a percentage of components is not a percentage of true robot mass. Unknown parts never contribute zero to a claimed total. Show 'known subtotal' when incomplete. Centre of mass is available only with compatible mass and centroid data, otherwise show the centre of the known subset with a clear label or omit it. A fabricated midpoint is not a known centroid.

Mass/centre calculations use the physical design pose, not an exploded presentation view. Hidden parts still count; inactive alternatives and reference-only geometry do not. Permit explicitly recorded nonvisual mass items for wires/fasteners, with source/estimate and duplication warnings. Cost is optional, uses a dated unit-price source, and must not treat purchased stock as free or create finance records.

## 10. Live mechanism demonstration

First release supports explicitly configured rigid groups, one-axis revolute joints and one-axis sliding joints, with parent/child, origin, axis, home pose, limits and display name. These are prescribed kinematic motions, not force/dynamics simulation. Unsupported imported mates stay static and are listed.

A presenter can move an intake arm, open a hopper or extend a mechanism with a labeled slider, Play/Pause and Reset. Animation speed is presentation timing, not measured motor speed. Manual coupled motion can be configured with a stated ratio; this does not validate gearing, torque or control code. Stop a demonstration at an indicated geometric conflict only when the available check supports it; sampled checks cannot guarantee continuous collision freedom.

Store demonstration state separately from the design rest pose. Exploded views are also presentation-only transforms. Neither can modify BOM quantities, source CAD, saved mounting positions or manufacturing approvals. Driving the robot on the field, scoring and autonomous physics are outside this Phase 2 release.

## 11. Alternatives, reviews and presentation

Create Option B from a saved version of Option A. Variants share immutable assets but retain independent dimensions, placements and choices. Compare uses synchronized cameras with side-by-side or transparent overlay, plus changed components and known mass/demand differences. Do not sum alternatives together or add spares to the visible robot accidentally.

Version history records who changed what and allows restoring an earlier version as a new head. Comments anchor to instance IDs and a scene version, optionally a 3D point and saved camera. Deleted/replaced anchors remain as historical comments, not attached to a different part with the same name.

Saved presentation steps contain title, camera, visible assemblies, annotations, optional joint positions and transition. Views, section/isolation controls and source credits are available. Presentation starts from a frozen saved version so an editor's later changes cannot disrupt a live demonstration. Required assets are preloaded with a readiness indicator; cached viewing is possible only while authorized and clearly labeled offline. Expired access must not create a permanent downloadable bypass.

Initial sharing is authenticated G3 audience only. View permission must cover all contained private assets. If some assets cannot be shared, block that share or explicitly create a redacted copy. No public links or public geometry downloads by default. Screenshot export includes concept/version and optional credits, and checks the same content permissions. Video capture and unrestricted model export are later work.

## 12. Handoff to Phase 1 and other systems

**Propose to build** is a deliberate action on a saved design version. It opens: select existing project → map assemblies → match existing requirements → review added/changed/removed quantities → confirm as permitted leader. An independent demo can remain independent indefinitely.

If no suitable build exists, a permitted leader can use the existing **Create build** flow and return to the saved proposal. Users without that permission can submit it for leader review. Preserve the chosen scene/version and proposal across this detour; do not force students to recreate a design or create a duplicate project.

Use stable instance/definition/version mapping, not names. Existing CAD occurrences and newly placed instances are reconciled. A matched existing instance is not added again. Quantity is counted once across active physical instances; reference geometry is excluded and spare demand is explicit. Bought subassemblies can count at purchased-assembly level or exploded fabrication level, never both.

The proposal is atomic, replay-safe and checked against current build revisions. Initially proposals can add requirements or update uncommitted planning data. Existing reservations, purchases, released manufacturing and installed hardware are shown as protected impact and require the existing change-disposition workflow. Removals are proposed dispositions, never automatic deletion, stock return or order cancellation. Source snapshots and scene version remain attached for traceability. A concept acceptance is not manufacturing release.

Generated custom parts enter the proposal with dimensions, material, generator version, scene reference and unresolved connections. They are labeled **Needs detailed CAD/review**, with an explicit option to create a linked CAD follow-up. A preview mesh is never sufficient manufacturing documentation. Source CAD updates can later replace the concept geometry through reviewed mapping while preserving requirement identity.

Separate finished-part demand from raw-material purchasing: six cut tubes are six finished parts, not six full stock bars; four acrylic panels are not four purchased sheets. Preserve length/area/volume units and quantities. Raw-stock selection, cutting waste and material allocation require a reviewed material plan; automatic nesting/cut optimization is outside this release. Never directly match a generated cut part to a stock bar and deduct one bar per instance.

Proposal states are **Draft → In review → Applied**, with **Changes require review** when its scene or target build has moved on. An applied proposal retains both exact versions. Later studio edits do not alter the live build; later build edits do not silently alter the scene. Show **Compare with adopted version** and require a new reviewed proposal for synchronization.

CAD Mentor can review the source snapshot or selected layout evidence. An optional AI request must identify scene version, selected instances, source coverage and deterministic checks; do not claim it inspected omitted geometry. Existing private-data permissions and AI budget apply. Automatic Gemini calls on every drag are excluded.

Inventory remains the source of stock; purchasing remains the source of orders; Phase1 remains the source of work and QC. Team Projects can receive one linked follow-up task by an explicit action, not a task per movement. No automatic Skills Academy pass or robot-health certification. Field simulator references remain references until a separately validated adapter exists.

## 13. Permissions and collaboration

Proposed default: active members create private demos using assets they are authorized to view; invited project participants view/comment; explicit editors modify team concepts; leaders with existing project authority adopt proposals; admins manage catalogue publication and source-sharing policy. Being an editor does not grant access to another person's private CAD. New grants are reviewed during implementation, not implied by this design.

Student onboarding must work without granting access to the entire Onshape account: publish specifically approved component snapshots to a defined G3 audience. Those library grants are explicit and versioned; source-account browsing remains separately authorized. Provide a permitted starter scene and a short Add → Place → Save → Present path. If no starter asset is approved, show the stock-shape starter path instead of an empty or inaccessible catalogue.

Initially one active editor per shared design, with a renewable server lease and read-only presence for other users. Leaders can take over an expired lease; takeover of an active lease warns the current editor and preserves unsaved recovery. Optimistic revisions remain mandatory even with a lease. Simultaneous multi-cursor editing is later work.

Save feedback: Saving → Saved with time → Offline draft → Save failed/retry. Autosave debounced meaningful operations; a continuous drag is one undo/save operation. Recovery is keyed by account/design/base version, never replayed over a newer remote version silently. Sign-out clears private local caches. Failed or uncertain requests retain operation IDs for safe retry. No silent last-writer-wins.

Offline private-asset access uses a bounded authorization window, checked on reconnection and before online sharing. Immediate revocation cannot be guaranteed on a disconnected device; do not promise it. Define the window before release; beyond it require reconnection to reopen private geometry. Retain recoverable edit metadata securely without making inaccessible geometry publicly retrievable.

## 14. Technical design and performance

Proposed records (names provisional): component definitions/versions, geometry assets, connector definitions, material records, scenes/versions, instances, joints, alternatives, presentation steps, review comments and build proposals/mappings. Store stock items by reference. Scene version freezes active asset versions, generator version and typed parameters, hierarchy, transforms, inclusion/mass strategy and relationships. Published versions are immutable.

Use one canonical transform/unit utility with fixtures for Onshape absolute transforms and local editor transforms. Geometry generation and expensive checks run in workers where feasible. Use reusable meshes/instancing for repeated hardware, levels of detail for display, cancellation for superseded checks and disposal of GPU resources. High-resolution geometry remains separate from the visual level of detail used to maintain interaction.

Import jobs are asynchronous, bounded and idempotent with progress/retry. Cache by asset content hash plus source configuration/version and visibility rules. Store large geometry in private object storage, metadata in the database; signed asset delivery, quotas and conversion limits prevent arbitrary imports from exhausting resources. No new paid service is implied. Native-CAD conversion beyond existing Onshape capabilities needs an explicit feasibility/cost decision.

Candidate acceptance targets, to validate on named devices before declaring support: representative desktop scene with 500 instances/approximately 1M rendered triangles, sustained 30fps orbit and responsive transform preview; cached scene usable within 5 seconds. Mobile review benchmark uses a lighter 150-instance scene and progressive detail. These are test targets, not measured current performance. If targets fail, optimize or disclose limits; do not silently omit components. Retry/load failures preserve access to the tree and saved metadata.

EN/HE layouts mirror application panels, not physical axes or the model. Always provide numeric input and keyboard alternatives to drag. Respect reduced motion. Phone UI uses a canvas plus bottom-sheet inspector, tap-to-place and large controls; precise multi-part editing is desktop-first. Context loss recovers geometry from saved scene data with a clear message. Accessible text lists cover part identity, dimensions and findings when WebGL is unavailable.

## 15. Delivery stages and completion gates

These are implementation increments inside Phase 2, not separate products. A prototype is not the completed release.

| Stage | Scope | Completion evidence | Relative effort |
|---|---|---|---|
| 2A — prove geometry and interaction | One mixed-source scene; real import, stock panels/tubes, units, hierarchy, transforms and numeric placement | Published chassis + team part + generated hopper/tube align correctly; save/reload preserves placements | Medium |
| 2B — complete design workspace | Catalogue workflow, remaining stock primitives, connectors, undo, alternatives, versions, access and recovery | Student completes compose/edit/compare without hidden tools; conflict and recovery tests pass | High |
| 2C — demonstrate and assess | Limited joints, presentation steps, geometry checks, known mass/centroid reporting | Preset demonstration plays and resets without changing design; incomplete evidence is labeled | High |
| 2D — adopt and release | Atomic Phase1 proposals, change protection, mobile/RTL, performance, release docs and production acceptance | Full reference journey through a reviewed build proposal without duplicate demand or stock mutation | High |

Start with 2A after design approval. 2B–2D remain required for the complete Phase2 described here. All software work can be done remotely using authorized model access. Workshop access is needed to compare selected dimensions/mass/clearances to physical parts and observe student usability, not to invent a demonstration. Timing estimates should follow 2A's measured import/geometry results; no firm completion-date promise is supported yet.

Excluded: full CAD authoring, automatic Onshape write-back, FEA, validated dynamic robot physics, manufacturing-ready exports/CAM, exhaustive FRC catalogue, public gallery, unrestricted geometry export and simultaneous collaborative editing. They must not appear as working controls.

## 16. Acceptance matrix

| Test | Required outcome |
|---|---|
| Empty demo without a project | Create, save, reopen and present without creating operational records |
| Mixed-source reference robot | Chassis, team CAD and custom hopper/tubes coexist at verified scale |
| Inch STL vs metre Onshape | Known dimension agrees after normalization; unknown units require confirmation |
| Nested/repeated assemblies | Correct transforms and counted quantities, no double application |
| Tube/plate parameter errors | Invalid geometry rejected before save; cancelled edits restore original |
| Catalogue motor resizing | Fixed variant cannot be stretched into a fictional product |
| Mount change | Changed size invalidates affected attachment verification |
| Missing/partial model | Visible coverage warning; no false clearance or mass completeness |
| Transparent acrylic | Selection remains usable and source/material labels stay independent of appearance |
| Mass aggregate vs children | Exactly one counting strategy; hidden parts count, exploded pose does not alter physical result |
| Alternatives | Independent edits and comparison; only selected alternative contributes to proposal |
| Motion | Limits/reset work; demonstrator pose never becomes a manufacturing position |
| Two editors/offline/retry | No overwrite, duplicate instances or duplicate build proposals |
| Revoked/unauthorized source | No leaked cached geometry, public URL or inherited access through a scene |
| New source revision | Explicit comparison/adoption; current scene remains pinned until accepted |
| Phase1 handoff repeated | No duplicate requirement; protected executed work cannot be rewritten |
| Desktop, phone, Hebrew | Discoverable controls, no overflow, accessible numeric/tap alternatives |
| Physical and learner pilot | Record observations separately from automated software results |
| Menu and first use | Open studio without a build; same label in menu context and build; starter path works for a student |
| Edit duplicated panel | This-part edit leaves other copies/alternatives unchanged; linked edit previews affected instances |
| Incomplete connections | Floating parts and missing adapters remain visible unresolved work; no fabricated mounting verification |
| Custom-shape handoff | Parameters preserved; detailed-CAD follow-up possible; no manufacturing release from preview |
| Cut parts vs raw stock | Finished quantities do not become incorrect bar/sheet purchases or inventory deductions |
| Post-adoption divergence | Saved versions stay stable; changed scene/build requires another reviewed proposal |
| Delete/replace referenced component | Dependency preview, preserved world poses where chosen, unresolved references and complete undo |
| Asynchronous checks after edits | Stale results cannot replace newer results or appear current; changed findings reopen |
| Concept without target build | Authorized create-and-return or leader-review path preserves the proposal |
| Offline authorization expiry | Reopening private geometry requires reauthorization after the bounded window |

## 17. Design review findings and decisions

Workflow pass: added independent demo entry; explicit stock-shape construction; scoped add/inspect controls; imported assembly grouping; source-update review; clear concept-to-build handoff. Without these, the feature would be either inaccessible without a project or only a viewer.

Accuracy/reliability pass: separated rest, animation and exploded poses; fixed aggregate/child mass and demand duplication; retained unknown-mass coverage; invalidated attachments after resizing; handled unitless files, immutable revisions, single-editor conflicts and private assets inside shared scenes. These are release requirements, not optional polish.

Recommended review decisions: accept the name/navigation, initial primitive set, limited kinematic motion and private G3 sharing defaults. Asset discovery must confirm one usable published chassis and representative catalogue parts; none has been selected or cleared merely by this design. Choose a representative student laptop/phone for performance acceptance. These are implementation inputs, not a request to provide passwords or create a complete robot first.

Additional end-to-end review: clarified the direct Robot Build menu entry and consistent Studio name; isolated edits to duplicated shapes; surfaced missing mounting work; separated finished parts from raw stock; specified custom-concept CAD follow-up and post-adoption divergence; made student access work through explicitly approved snapshots. These extend the existing 2B editing/access and 2D handoff gates, not a new phase or a claim of full CAD authoring.

Final failure-path review: specified dependency-aware delete/replacement, revision-bound asynchronous checks, separate presentation/design readiness, a no-existing-build handoff and honest offline revocation limits. No further product module is justified by this pass. Remaining feasibility inputs are model availability/reuse, source fidelity, named-device performance and learner usability; verify these during delivery rather than claiming a gap-free implementation from a design document.

## 18. Evidence and related records

- [Phase 1 release and boundaries](ROBOT_BUILD_PHASE1_20261010.md)
- [Existing team workflow](ROBOT_BUILD_PHASE1_TEAM_GUIDE_20261010.md)
- Existing implementation inspected: `CadDesignViewer.tsx`, `BuildScopeDetails.tsx`, `BuildSimulationReferences.tsx`. Existing simulation links track references, not editable scene synchronization.
- [Onshape assembly API and transform conventions](https://onshape-public.github.io/docs/api-adv/assemblies/): source for absolute occurrence transforms. This does not establish a full G3 mate solver.
- [Onshape mass properties](https://cad.onshape.com/help/Content/View/mass_properties_tool.htm): source for provider mass capabilities; individual material completeness still requires inspection.
- [Kraken X60 manufacturer page](https://store.ctr-electronics.com/products/kraken-x60): example manufacturer CAD source. No claim that all catalogue geometry is available or licensed for redistribution.
