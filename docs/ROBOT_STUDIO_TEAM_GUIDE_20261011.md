# 3D Robot Studio — team workflow

Open **Robot Build → 3D Robot Studio**. A concept does not require an existing robot project. It is private until its owner explicitly shares it.

## Compose a concept
1. Create a named design. Under **Add**, use **Create chassis & belly pan** to enter outside dimensions, or search the single parts library. Ready models have geometry thumbnails; **External CAD · import required** entries are source links, not installed models. Templates, stock shapes, saved assemblies, connected Onshape and GLB/STL imports remain available.
2. Check the source and dimensions. STL requires declared units; GLB is converted from its standard Y-up orientation to the studio's Z-up coordinates. Onshape imports are pinned snapshots. The initial catalogue uses attributed 6328 team exports; these are not manufacturer-certified models. Missing components must be imported rather than substituted with an invented model.
3. Select the component in the canvas or Parts list. Move/rotate with handles, use X/Y/Z step buttons, or enter millimetres/degrees. **Place on ground** aligns its lowest point to Z=0. Use **Full screen** for the whole editor and **Focus view** to hide side panels. Edit stock-shape dimensions in the inspector. Catalogue and imported CAD geometry cannot be stretched. **Delete** removes the selected instance; **Undo** restores it. Assemblies offer a choice to keep or remove children.
4. Attach to a parent while preserving position; use user-defined mounting frames or alignment controls when useful. Record needed adapters and mounting work. A reviewed concept connection is not a verified bolt pattern or manufacturing approval.
5. Duplicate individual parts or whole subassemblies. Edits affect that copy only. Applying dimensions to selected same-kind copies explicitly previews the affected names. To reuse a mechanism later, save its design and use **Add → Reuse a saved assembly** in another design.

On a phone, the canvas stays first. **Parts & tools** opens the bottom drawer; selecting a part opens **Edit selected**. **Canvas** closes the drawer. Numeric fields provide an alternative to small 3D handles.

## Compare and review
- Create another alternative for a different mechanism or layout. Alternatives retain independent parts and share immutable source assets. Compare shows synchronized views and changed components.
- **Checks** reports unknown mass, unresolved connections and bounded approximate geometry findings. A recorded reason acknowledges a finding without removing it. Changed component data reopens that acknowledgement.
- A known mass subtotal is not total robot weight. Enter a measured/manufacturer mass or a density estimate with its source. Hidden components still count; reference-only components and inactive alternatives do not. Avoid counting both an imported assembly's aggregate mass and its extracted children. No centre-of-mass value is fabricated when centroid data is absent.
- **History** contains saved versions and version-specific comments. Restoring produces a new draft; it does not rewrite history. Task source links open their exact saved version read-only.

## Demonstrate
Save, then choose **Present**. Configure optional limited joints in Design first. Use independent sliders or coupled motion, reset to the design pose, show an exploded view or visual cutaway, and save named presentation steps. These display operations do not change physical placements or operational records. Screenshots include the concept/version and source credits.

This is a layout and demonstration tool. It does not validate motor torque, dynamics, structural strength, continuous collision freedom, manufacturability or field performance. Detailed CAD and manufacturing files remain in Onshape and the established Robot Build workflow.

## Bring an accepted concept into the real build
1. Save the concept and share it with the reviewing leader. All recipients must also be entitled to its private CAD snapshots; sharing a scene does not grant access to the entire Onshape account.
2. Open **Build**, choose the project, and review each physical instance. Match an existing requirement or propose one new finished component, optionally into an assembly. Skip anything not intended for the real robot.
3. Submit the saved version. An authorized build leader accepts it. Repeating acceptance does not create duplicate demand. This does not reserve stock, place purchases or approve manufacturing.
4. Use **Assign detailed CAD work** for a normal project task with an owner, brief and acceptance criteria, linked to the exact concept version. Share the design with that owner first.
5. If an adopted component changes, create its candidate in Robot Build and complete the independent change-review process. Match the approved candidate in the new studio proposal. Removing a concept part does not cancel purchased or manufactured work.

No project yet? Create one in the separate Projects tab, return and refresh available projects. A student without assignment permission can share the concept with a leader and request the build in its discussion.

## Saving and access
Only **Save version** records an immutable server checkpoint. Moving parts and Undo do not create saved versions. The visible status distinguishes a local draft from a saved version and read-only access. Save before leaving or switching devices; tab-local recovery is not cloud persistence. One editor holds the editing lease. A stale save is rejected rather than overwriting another editor. Unsaved browser draft metadata can be recovered as an alternative; a brand-new draft can also recover after refresh in the same tab. Source access is periodically revalidated and expires after a bounded connection failure; private geometry is not made public for offline convenience.

This guide describes the implementation workflow. Consult the implementation/release record for the deployment and acceptance status; this document alone is not evidence of a production release or a physical workshop trial.
