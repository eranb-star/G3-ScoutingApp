# Robot Build: complete workflow design and remaining delivery contract

Execution authority: [ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md](ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md). This document supplies detailed UX/domain rationale; the master supplies consolidated ordering, traceability and release gates.

Date: 9 October 2026. Status: proposed design, not an implementation or deployment claim. Requested by the user after the integrated Robot Build release. Scope: the complete CAD-to-workshop-to-installed-robot workflow, integrated with existing G3 systems. Two subsequent challenge reviews are recorded below. No finite review guarantees that no further gap will emerge.

## 1. Evidence and boundaries

System-wide integration review: [ROBOT_BUILD_SYSTEM_INTEGRATION_REVIEW_20261009.md](ROBOT_BUILD_SYSTEM_INTEGRATION_REVIEW_20261009.md). Its S01–S11 contracts cover existing maintenance/reliability registries, shared stock/printing, tasks, learning, software/simulation, competition, attendance and client lifecycle. These supplement the UX design before development.

Production baseline: [release record](ROBOT_BUILD_RELEASE_20261009.md). Existing invariants and history: [implementation contract](ROBOT_BUILD_SPEC_20261009.md). The release record establishes shipped scope; this document establishes remaining design. Historical intermediate implementation notes are not current gaps.

Reviewed source: ProjectBuildWork, CadBuildParts, BuildDemandReview, BuildStockActions, BuildManufacturing, BuildOperations, BuildExistingStock, BuildKits, projectBuildWork.css; connector bom.ts/index.ts; manufacturing, operations and installation migrations. These establish structural import, private metadata drafts, reviewed sourcing, existing tasks/reviews, quantity reporting, operations, stock movements, whole-job QC output, kits and configuration links. They also show separate setup forms, manual instructions, generic purchasing navigation, and a unique output batch per job. Source inspection is not additional live acceptance.

External benchmark: [FRCBOM](https://frcbom.com/) advertises live Onshape synchronization, materials/process metadata, subsystem progress, linked model/BOM selection, workshop access and vendor-order conveniences. These are published claims, not our authenticated test results. Our goal is one coherent G3 workflow, not copying a competitor's UI.

Onshape documents [webhooks](https://onshape-public.github.io/docs/app-dev/webhook/), [translations](https://onshape-public.github.io/docs/api-adv/translation/) and [drawing APIs](https://onshape-public.github.io/docs/api-adv/drawings/). These make integration plausible, but do not prove our account's scopes, quota, every document type or revision-pinned export behavior. Validate each before advertising it. No CAD editing, automatic CAM generation or new AI disclosure is included implicitly.

## 2. Product structure: one build workspace, existing records

Canonical location: Work → Projects → selected robot project → Robot Build. A Home/My work item opens the same task directly. Engineering Hub/CAD Mentor offers “Use in Robot Build” with project and subsystem context. Inventory and Purchasing remain their existing authoritative workspaces; contextual panels and return links avoid losing the build context. Do not add a competing top-level BOM app or a second assignment/review/finance system.

The project identifies season, robot/variant, owner, milestones and existing physical asset. A subsystem is a grouping within it, not another copy of the project. It can draw from multiple approved CAD scopes across documents. A prototype, practice robot, competition robot and spares are explicit demand destinations; cloning a plan never clones physical stock, accepted evidence or installation.

Five workspace views:

| View | Purpose | Default content |
|---|---|---|
| Overview | What prevents this robot being ready? | Subsystem readiness, current blockers, dates and owners |
| Parts | What is needed and how will we obtain it? | Compact BOM, sourcing coverage, current release, change inbox |
| Workshop | What can be worked on next? | My work / team queue; operations, blockers, inspection queue |
| Assembly & tests | What is physically installed and verified? | Kits, installed configuration, evidence, replacements |
| Activity | What changed and who confirmed it? | Human-readable audit, linked issues, corrections and receipts |

These are views of existing records, not five new workflows. Desktop tabs; phone compact navigation with Activity in More if space requires. Students default to My work. Leaders default to Overview. A person with several responsibilities changes the view, not their security role.

## 3. Normal end-to-end journey

### Clarification: robot identity and the compact main screen

User reference: compact subsystem parts list with material, process, quantity and a small progress sidebar. Adopt its information density, not its colors. The proposed desktop default is a wide parts list, subsystem filter and concise actionable summary; detail/model opens on selection. No permanently competing full-width table, large viewer and large statistics panel. On phones the summary collapses and details open as a full screen. This is a design target, not a claim that the current production UI already achieves it.

“Selected robot” means the team's build project/target, for example “2026 Offseason robot” or “2026 Competition robot,” not a simulator model, repository, or an Onshape file. Names are examples, not verified existing records. Students inherit the target from their assigned job; with one active target there is no selection step. Leaders select a different target only when multiple builds genuinely exist.

Current implementation: physical assets and designed/as-built/as-installed configurations exist at project scope, exposed through ProjectTaskReview → “Register robot / prototype configuration,” including “Register a physical asset first.” This is technical review setup, not a clear top-level robot onboarding screen; no claim is made about which assets are actually registered in production.

Proposed leader setup: existing project → Robot Build → Set up build. Reuse the project's name and members, confirm season/purpose, link an existing physical robot if applicable (or mark “not built yet”), then link subsystem CAD sources. Show the resulting identity under Build details with edit access for leaders. Manufacturing can start from a design without an assembled robot or complete master assembly; actual installation/test evidence later requires the real physical identity.

Season/purpose, physical robot and configuration revision are separate. If offseason work modifies the same chassis, preserve its physical identity and create new configuration history rather than pretending a second robot exists. Current asset IDs are project-scoped, so cross-project continuity needs an explicit reviewed linkage/transfer design; do not silently deduplicate matching names or create duplicate physical stock. A separate practice chassis is a separate physical robot even when sharing a CAD design. Onshape assembly sources and software repositories are links to the build, not its identity.

### A. Connect and establish what we are building

Leader opens an existing project, picks the robot/variant and subsystem, then selects an Onshape document, assembly and configuration. Show selected source, coverage, last successful check and source link. Discover new accessible documents separately from importing them: new access does not automatically expand the project or expose private designs.

On first use, a short guided setup asks: sources; required build quantities and spare quantities; existing work/stock/orders/installed parts; responsible people and milestones. Save a draft at each step. Default to one robot, zero extra spares, and existing project memberships; explicitly confirm quantities. Students never configure this setup.

If the robot is incomplete, import completed assemblies and add manual requirements. Part Studios/sketches can support design review, but must not be falsely treated as an assembly with reliable occurrence quantities. Missing references and incomplete imports block release of affected scope, not unrelated valid subsystem work.

### B. Review parts and reconcile demand

Parts table: part/name, subsystem, make/buy/reuse, required, covered, shortage, release, next action. Expand one row into a part detail panel, preserving search/filter/scroll. Advanced source IDs and occurrence paths live under provenance.

Detect repeated occurrences, overlapping roots, suppression, purchased subassemblies and configurations. Group identical approved revisions for production while retaining allocation by subsystem/robot/spares. Copying or moving an Onshape part does not prove identity; leaders confirm uncertain matches. Materials and part numbers assist matching but never justify name-only merging.

Import available properties with provenance. Missing material/process/part number is visibly missing, never guessed. Distinguish Onshape material from chosen stock specification; a material name alone does not define thickness, alloy condition, tolerance or manufacturing method. Team-approved mappings can prefill suggestions; overrides remain visible with reasons. Supplier/catalogue items use manufacturer and manufacturer part number where available.

Reconcile existing stock, orders, work in progress and already installed parts separately. Do not recreate fulfilled demand. Unknown history remains unknown and needs the applicable verification; reconciliation never invents manufacture dates, quality approval or stock movements.

### C. Release a usable work package

One “Prepare work” panel gathers the approved revision, quantity/destination, drawing/files, instructions, material, operations, inspection criteria, owner and needed date. It creates/links existing task and review records behind the UI. Do not require a leader to leave the screen to manually configure three different checkpoints before linking the work.

Use operation templates (cut/drill/deburr, print/clean/inspect, purchased receipt/inspect, assembly/test); customize only needed fields. Required release data depends on the operation. A simple purchased fastener does not need a machining drawing; a machined plate needs sufficient dimensioned instructions. Missing essentials block release with named actions; optional fields do not.

The package freezes part revision, source configuration/microversion, relevant drawings and files, material specification, tolerances, operation revision and inspection criteria. File provenance includes checksum, units, generation status and source revision. No file available means “Missing,” not a thumbnail masquerading as manufacturing instructions. Existing native Onshape view remains accessible to authorized designers; workshop files are approved exports or approved uploads.

Export generation is a background job with pending/ready/failed states and retry. Support formats per actual provider validation and purpose (e.g. drawing PDF, approved DXF/STEP, mesh where appropriate). A model export is not a ready machine program. Do not infer CAM settings, feeds, speeds or toolpaths.

### D. Source and schedule

Review stock coverage and reserve eligible finished parts or raw material using existing inventory. For shortages, link an existing request or create one in existing purchasing. Show requested/approved/ordered/received/inspected separately. An unapproved request is tentative coverage, not confirmed availability. Dates are promises only when supplied; otherwise show unknown.

Grouped vendor exports are conveniences, not automatic order placement. Requests retain approver, currency, quantity, pack size, shipping and finance authority. Students see availability/expected date, not private financial records.

Jobs enter the ready queue only when their applicable release, material, dependencies, qualification and supervision conditions are satisfied. Leaders can see and resolve each blocked condition. Start with a simple machine/process queue and availability flag; do not promise an automated factory scheduler or fabricated completion forecast.

### E. Student manufactures

Home → My work → job opens directly to: exact part/revision, current operation, quantity, drawing/model, instructions and one next action. The student sees “Continue drilling,” “Report 2 completed,” or “Send 4 for inspection,” not internal record types. Report a problem stays available.

A successful operation report advances the existing task; it does not ask for separate task progress and manufacturing progress. Report quantity for this action with a visible resulting total, avoiding ambiguity between increment and cumulative count. Corrections use a reason and history rather than erasing earlier events.

Material withdrawal, use and return are distinct. Students without stock permission can request material or report intended use; an authorized stock action confirms ledger changes. Machine eligibility comes from explicit practical authorization where required, not merely watching a course. Different users can work on separate operations/lots with conflict checks.

### F. Inspect and disposition

Inspector sees the exact lot, release, instructions and criteria. Record inspected quantity as accepted, rework, rejected/scrap, or held for investigation; unresolved quantities remain pending. Accepted sublots can proceed while the remainder stays open. Rework has linked instructions/operations and must be inspected again. Never refund consumed material automatically when a print or machining attempt fails.

A job closes only when planned deliverable quantity is accepted or the remaining demand has an approved disposition. Keep operation completion distinct from quality acceptance. Accepted output receipt is recorded exactly once. Where inspector also has stock authority, offer a single combined inspected-and-stored transaction with a bin; otherwise route the same record to stock receipt without duplicating inspection.

### G. Kit, assemble, install and test

Assembly view shows required components and eligible accepted quantities by batch/revision. A kit is ready only for its approved assembly scope; prerequisites may permit explicit staged assembly. Scan/search labels, record actual installation, and link it to the physical robot/configuration. A substitute needs an engineering decision, not an inventory-name edit.

Record inspection/test evidence against the configuration actually tested. A later replacement preserves history and triggers affected rechecks. Do not declare the whole robot verified from a kit installation or every part being manufactured. Removed parts enter a disposition/inspection path before reuse.

### H. Maintain, close and carry forward

Pit replacement is the same part/batch/installation flow with a compact urgent interface. Emergency deviations use existing authorized exception/signoff, expiry or follow-up where appropriate, and unresolved verification stays visible. Project closure resolves reservations, outstanding orders, work in progress and spares. Next season reuses templates and learning, not false approvals or consumed inventory.

## 4. Screen and interaction contract

Visual language: use existing G3 magenta as the primary action accent, neutral compact surfaces, clear type hierarchy and restrained status colors. Avoid giant decorative headers, equal-weight button grids and nested accordions for core work. Use shared components across Inventory, Purchasing and Robot Build rather than a local alternative design system.

Desktop parts layout:

```text
Offseason robot / Intake        CAD checked [date/time]   Review changes (3)
Overview | Parts | Workshop | Assembly & tests | Activity
Search parts...   Subsystem: Intake   Needs attention   More filters
Part / revision      Required  Available  Shortage  Next action
Intake plate / B          4        2          2     Prepare work
  Selecting row opens: [3D/drawing] [quantity & sourcing] [release & action]
```

Phone job layout:

```text
Back to My work        Intake plate · B
Drill holes            2 of 4 completed
Drawing | 3D           [expand viewer]
Material and location  [only relevant fields]
Step instructions / required check
Report a problem
[Report completed quantity]  persistent bottom action
Saved: 2 completed • 9 Oct 2026, 14:32 • by [person]
```

Numbers above are illustrative, not real project data. The detail view offers Instructions, Progress, Material and History; it does not expose every edit form simultaneously. Bulk changes show a review of affected rows and reject incompatible revisions. Destructive actions live in a labeled More menu with consequences. Batch actions must not hide partial failures.

Controls align on the input baseline with consistent heights and label space. Rows have one primary action, useful status and a disclosure for detail. On phones use compact stacked rows rather than squeezed tables. All essential touch actions at least 44px; keyboard/focus support, contrast checks, text labels alongside colors, 200% zoom, screen-reader save/error announcements and safe-area-aware bottom actions. No hover-only action.

Fullscreen viewer occupies the available viewport with task title/revision, drawing/3D switch, fit/isolate, exit and necessary workflow controls. Tools wrap or collapse; they do not reduce the canvas to a small box. A 2D drawing/sketch is labeled and oriented appropriately, not presented as a complete solid model. Missing/partial geometry is explicit. Bidirectional model/part selection uses occurrence identity; unsupported geometry never affects structural counts.

Use the Settings language preference. Translate UI and structured templates; preserve original part names and engineering notation. Hebrew RTL layout, LTR dimensions/part numbers/links, no mixed bilingual paragraphs by default. Dates include calendar date plus time when useful, not weekday alone. Files in another language show their original language; machine translation is not an approved technical instruction by default.

Save feedback is persistent: saving, confirmed receipt, failed, or unconfirmed. Retrying an unconfirmed transaction uses the same operation identity. Offline text can be a clearly labeled local draft; do not claim stock, inspection or release was saved without the server. Drafts must be scoped to account and cleared/isolated at logout on shared devices.

## 5. Domain rules and system ownership

Keep three explicit versions: latest CAD candidate; released build package; installed physical configuration. A newer candidate never silently edits the other two.

Existing project/task/review/asset/configuration models own assignment and engineering authority. Existing inventory ledger owns quantities and reservations; purchasing owns approvals/orders/receipts; finance owns expenditure. CAD Mentor owns source-linked analysis; Skills Academy owns training evidence; Assist proposes with referenced revision and evidence. Suggestions never become approvals automatically. Link an issue across these records rather than create disconnected copies.

Add or extend only missing concepts: source scope/subsystem grouping, stable reviewed part identity with revisions, release-package file manifests and grants, revision-change sets and decisions, demand allocations, operation lots/dispositions, raw-material allocations, and read models for queues/readiness. These are implementation design concepts, not claims that new tables already exist. Reuse existing structures when they can express them reliably.

Quantities need a ledger, not one overloaded status. Demand destination, sourcing coverage, physical location, operation state, quality disposition and installed state are separate. Allocations cannot count the same batch twice. Unit dimensions are enforced (pieces, mass, length, area); conversions require a known factor. Manufacturer pack quantity and inventory unit are separate. Engineering material volume/mass alone is not a reliable purchased stock requirement.

Whole-job QC currently uses one output batch per job: extend compatibly to lots, retain existing historical meaning and constraints until migrated. Do not reinterpret completed old jobs as partially accepted. Raw-material reservation joins the existing common availability calculation including fundraising/printing. Transfers, waste and leftover stock cannot create material from rounding.

## 6. CAD synchronization and revision review

Proposed pipeline: provider notification or fallback check → queued source refresh → complete pinned candidate snapshot → semantic comparison → leader review → new released package and specific work dispositions. Validate callback authenticity, deduplicate notifications, debounce rapid edits, reject stale/out-of-order results and reconcile missed notifications. A notification is a trigger to re-fetch, not trusted manufacturing data.

Periodically reconcile only authorized configured scope, with quota-aware backoff and observability. Show last attempt, last success, source revision and unresolved failure distinctly. Failure never replaces good data with an empty BOM. Do not promise one-second sync; establish measured service targets after provider testing. Registration scope and permissions must be confirmed before enabling webhooks with the existing read-only connection.

Change review shows additions/removals, quantities, material/metadata, geometry/configuration references, affected instructions and work. Include reserved, ordered, WIP, accepted, installed and spare quantities. Decisions: adopt for unstarted work, continue approved old revision for explicit destinations, rework, quarantine, cancel remaining work, or defer. Compatibility across revisions is an engineering decision. Removed demand cannot silently cancel an order or scrap a physical part.

## 7. Permissions and operational readiness

Capabilities are scoped to project and action, not assumed from a role title. Students read released work they are assigned/authorized to see and report their work. Leaders manage demand and assignments within scope. Reviewers approve under existing policy. Inventory staff confirm stock; buyers manage requests/orders; admins manage connections and explicit sharing. A leader need not receive blanket inventory or finance administration to prepare a job.

Current CAD access is private to its connecting admin. Proposed released-file sharing requires explicit project-scoped permission and server checks, including download and thumbnails. Private CAD analyses/credentials do not ride along. Revoking membership stops future access; previously downloaded files cannot be remotely erased. Native Onshape links still require appropriate Onshape access; app authorization does not sign a student into Onshape.

Enterprise acceptance includes denied cross-project access, idempotent mutations, optimistic concurrency, audit of correction/approval/overrides, durable background work, monitoring/retry, storage retention/backup/restore, bounded queries and private file URLs. Define migration, feature rollout and rollback preserving audit history. This design does not assert that project-level enterprise readiness has already been proven.

## 8. Initial remaining-gap register

| ID | Remaining topic | Baseline | Completion criterion |
|---|---|---|---|
| G01 | Guided setup and one job screen | Separate setup/task/review forms | Leader prepares work in one flow; student reports once |
| G02 | Metadata mapping | Structural names/identity/quantity | Available properties imported with provenance; missing essentials explained |
| G03 | Released files and student grants | Manual instructions; private geometry | Correct approved files accessible only within explicit scope |
| G04 | Part/model selection and full viewer | Separate views | Selection matches exact occurrence/revision; honest missing geometry states |
| G05 | CAD change management | Fixed imports/overlap decisions | Candidate changes + downstream disposition without rewriting work |
| G06 | Subsystem readiness | Project tasks and build stages | Evidence-based quantities/blockers at each milestone |
| G07 | Personal/workshop queues | Existing assignments/operation records | Actionable queue and contextual block resolution |
| G08 | Raw-material reservation | Plan + actual ledger usage | Shared stock floor includes manufacturing demand and printing |
| G09 | Partial lot QC and rework | Whole-job output receipt | Partial accepted quantities proceed with conservation and traceability |
| G10 | Purchase continuation and exports | Existing requests + restricted adoption | Partial orders/receipts reconciled; precise navigation; no duplicate coverage |
| G11 | Initial installed/WIP reconciliation | Existing loose-stock QC | Robot already in use can be onboarded without fictitious history |
| G12 | Integrated issue resolution | Existing issues/reviews/tasks | Report once; linked owner, disposition and verified closure |
| G13 | Production acceptance / Android | Small real import, synthetic phone checks | Real representative full flow and supported device acceptance |

## 9. Delivery sequence and release gates

1. Identity/scope and release-file feasibility; guided leader setup, released student access and part/job view. Validate real account metadata/export examples before promising formats. Preserve existing production routes.
2. Personal/workshop/inspection views, lots and materials. Exercise mixed success/failure, shared stock and role-specific operations.
3. CAD refresh/change decisions plus subsystem readiness; conservative source and dependency logic first, then measured automation. Until delivered, show snapshot freshness and manual checks explicitly.
4. Initial reconciliation, purchasing exceptions, assembly/repair closure, and operational hardening. Urgent gaps needed by the team's real pilot move earlier; none disappear from scope.
5. Representative live pilot with student, leader, stock/buyer and reviewer; controlled rollout, APK build/device checks and handover. Do not call all phases complete when only code is merged.

Optional later conveniences: Onshape side panel, FRC Orders catalogue integration, advanced machine scheduling, automated stock nesting/cut optimization and serial tracking for every piece. Exact traceability for configured critical assets remains required now; blanket serial numbers are not. These conveniences are not prerequisites for a usable end-to-end workshop workflow.

## 10. Initial acceptance journeys

Each journey needs observable UI outcome, server assertions, role denial tests where applicable and named evidence. Fixture tests do not substitute for provider/device acceptance.

1. New subsystem with nested/repeated/configured parts plus manually added wiring requirements.
2. Already built/partially built robot with existing orders and stock, without duplicate demand or stock.
3. Student opens assigned operation from Home, reads exact drawing and reports once on a phone.
4. Ten manufactured pieces: six accepted, two rework, one scrap, one pending; only six may proceed.
5. Same material requested by Robot Build and fundraising printing concurrently.
6. CAD revision arrives during machining and after installation; old records persist and affected work is explicitly resolved.
7. Purchased pack, partial delivery, rejected receipt, supplier replacement and returned excess.
8. Replacement installation requires appropriate retest of actual configuration.
9. Duplicate tap, lost response, stale screen and two workers cannot duplicate quantity or hide another report.
10. Expired connection, missing model/file and incomplete import remain actionable without fake completeness.
11. Student cannot view private CAD/finance or obtain files after grant revocation; reviewer authority is enforced server-side.
12. English/Hebrew, phone browsers and APK: readable rows, aligned controls, fullscreen tools, keyboard, zoom and persistent receipts.

## 11. Review record

Initial design complete. Follow-up challenge passes and amendments are recorded below rather than asserting the first design is exhaustive.

### Challenge pass 1: physical workshop and quantity scenarios

Method: walked the initial design through a partially built robot, common parts across two robots, failed manufacture, a purchased pack, assembled stock and a late CAD edit. The following additions are requirements, not optional implementation notes.

| Gap found after initial design | Design amendment | Acceptance evidence |
|---|---|---|
| Multiple destinations can still double-count a shared batch | Separate physical supply from demand allocations. Show robot A, robot B and spare allocations; a batch may cover several destinations only up to eligible quantity. Source occurrence count × explicitly selected build quantity is separate from added spares. | Eight accepted pieces allocated 4/2/2; a ninth allocation rejected; cancelling one destination releases only its allocation. |
| A generic material reservation does not describe real stock shape | For sheets/tubes/bars retain stock size, profile/specification and usable remnants where needed. Reserve a compatible blank, length or sheet quantity; do not pretend equal mass means usable geometry. Label planned waste and actual scrap. | Same mass but wrong thickness/profile cannot fulfill reviewed material specification; offcuts return only by explicit measured disposition. |
| Partial inspection can produce misleading totals | Per lot, accepted + rework + scrap + held + pending = submitted pieces. Re-inspecting a rework piece moves its disposition, never creates another piece. Additional production for scrap is distinct replacement supply against the remaining demand. | Ten-piece example conserves ten original pieces; replacement starts a new traceable quantity and consumes new material. |
| Assembly can be an inventory transformation, not just installation | Distinguish stock assembly production from installation kit. An assembled gearbox consumes identified component allocations and produces one accepted assembly; it cannot leave both children and parent available as independent stock. Disassembly needs measured disposition and inspection. | Assemble two units; children decrease once, two accepted parents appear once; duplicate submission does neither again. |
| Opening already installed work is not loose-stock verification | Provide “Already installed” reconciliation against physical asset/configuration, known identity and evidence; mark unknown revision/condition clearly. No warehouse issue/receipt is fabricated. Resolve demand only to the extent verified and approved. | Existing robot onboarding changes no warehouse stock and cannot become competition-ready with unresolved required verification. |
| Purchased pack receipt may overfill demand | Distinguish order unit, pack factor and stock unit. Link demand coverage only to allocated pieces; excess becomes available stock after applicable receiving/inspection. Partial order chains, cancellations, supplier returns and replacements preserve original finance references. | Buy a pack of 10 for six needed: six allocated, four available; return two updates the real ledger, not the demand history. |
| Cross-revision stock cannot be assumed interchangeable | Approved substitution/equivalence is scoped to destination, revision and quantity, with reviewer evidence. Old spares remain identifiable; purchasing cannot approve engineering compatibility. | Revision A may satisfy one approved destination but stays blocked for another requiring B. |
| Change notices can come after a student has opened a job | On opening/starting/submitting work recheck package validity. New candidate alone is an advisory; explicit withdrawn release/quality hold blocks affected starts and acceptance. In-progress work gets a prominent leader instruction, not automatic deletion. | Cached screen cannot submit against withdrawn release; old history survives; unaffected jobs continue. |
| Simple linear operation templates cannot express all real work | Support operation prerequisites, optional parallel steps and outsourced work. Initially present a linear default; only leaders expose dependency detail. External work has dispatch/return/inspection and owner without implying a student performed it. | Parallel preparation converges before assembly; outsourced work is not marked accepted merely because a supplier reports completion. |

Queue ownership: one accountable owner, optional contributors; reassignment preserves work and removes obsolete action notifications. A blocker records who can resolve it and whether it blocks just the current operation, the lot or downstream scope. Students choose plain-language reasons (missing material, drawing unclear, machine unavailable, failed check, other); the system links the existing issue and context automatically.

Add G14: allocation/units/remnants and stock-assembly transformations. Add G15: controlled substitution, live holds and dependency-aware operations. These additions belong in the production/material and change-management delivery gates, not an unbounded separate programme.

UI amendment: a single part detail must show four distinct facts without four giant cards: Needed; eligible supply; allocated destination; next action. “Available” never mixes on-order, rejected, installed and usable warehouse stock. Job reporting offers a short quantity form; exceptional disposition opens a dedicated panel rather than a universal action dropdown.

### Challenge pass 2: access, usability, service failure and truthful readiness

Method: re-read the amended journey as a new student, a leader without inventory rights, a departing connection owner, and two concurrent phone users; then traced provider failure, stale files, notification overload and readiness calculations. These additions are required before an enterprise-ready claim.

| Gap found in the amended design | Resolution | Acceptance check |
|---|---|---|
| “Percent complete” can reward bolts over a missing critical assembly | Default to separate counts: scope released, supply ready, installation complete, required tests passed, with explicit denominators. Subsystem readiness requires all applicable gates and no blocking issue. Unknown scope is shown as unknown. No averaged robot-ready percentage. | Many fasteners cannot conceal an unverified drivetrain; newly added scope changes denominator visibly with history. |
| “One next action” needs deterministic precedence | Withdrawn/held work first; missing authority/release/material/dependency next; then current ready operation, inspection, stock receipt, kit/install and test. Show the reason, responsible resolver and one direct link. A student never sees an actionable approval they cannot execute. | Leader without stock rights can prepare/assign work and request stock; no generic permission failure after submitting. |
| Files may be correct at export but mismatched at release | Freeze a manifest binding drawing/model/instructions to source/configuration and reviewed part revision. A filename alone is insufficient. Missing or independently revised drawing associations require explicit review. | Identically named older drawing cannot silently attach to a new release; units/scale and source references are visible. |
| Printed/downloaded instructions can become stale | Labels include job/part/revision and QR/deep link to live status; mark downloads with release identity and generation date. QR contains no credential or private payload. Old paper cannot be revoked physically; start/submission validates current release and holds. | Old print links to a superseded warning with exact current instruction; access still requires authorization. |
| Connection ownership can strand the team | Document reconnect/owner handover procedure using authorized account access, not shared passwords. Scope/source access revalidation, pending-sync pause and status survive owner departure. Approved retained project packages follow their explicit grant/retention policy; private working data is not automatically reassigned. | Connection revocation stops refresh, does not corrupt released history or grant a replacement admin private data automatically. |
| Many small requests can overwhelm the few reviewers | Risk-appropriate templates reuse existing authority. Only required gates block; low-risk routine actions need no new signoff. Inspectors have one queue, due dates, fallback responsibility and batch review only where evidence legitimately covers the batch. Training completion is not machine authorization. | One simple part does not demand multiple duplicate approvals; expired required practical authorization is explained, not silently ignored. |
| Every CAD edit can become a notification storm | Aggregate change sets; notify assigned resolver only for actionable work, overdue commitments or explicit holds. Use existing notifications with deduplication and user preferences; informational changes stay in Activity/digest. | Rapid repeated edits produce one review item; reassignment stops obsolete notifications; no mass email during sync. |
| Frontend retries do not solve concurrent work | Server validates operation identity, payload and expected state atomically. Same retry returns original receipt; incompatible retry rejects. Multiworker allocation/reporting uses reservations or bounded lot ownership. Stock/purchase effects use transactional boundaries and reconciliation for external jobs. | Two users cannot each consume the last blank, accept the same lot or duplicate a purchase. |
| Offline drafts can leak on shared devices or replay stale work | Account-scoped minimal drafts, logout handling, no offline approvals/stock success and conflict review on reconnect. Attachments upload with explicit confirmation and retry state. Do not silently background-replay consequential actions against changed revisions. | Logout/login as another student reveals no previous draft or private cached file through the app. |
| Large CAD can freeze the work screen | Lazy-load geometry, progressive/cancellable loading, bounded lists and server aggregation; structural counts remain independent. Show file size before optional large download. Low-memory mode uses approved drawings and metadata with a clear geometry limitation. | Workshop reporting remains usable when a model fails or exceeds device capacity; no false “all parts loaded.” |
| Integration navigation can still drop context | All task/order/inspection/learning links preserve project/part/revision and return target. Link specific purchase, not just the purchasing home. Relevant training is suggested without reassigning already completed learning. | Student returns from a drawing or lesson to the same operation; buyer sees exact linked request. |
| Financial and operational costs can double count | Show estimated material/operations separately from actual recorded costs. Inventory consumption is not a second supplier payment. Currency/unit/pack factors and chosen valuation remain explicit under existing finance rules. No invented costing total when inputs are missing. | Receipt and later consumption do not post duplicate expenditure; estimated vs actual remain labeled. |
| Restore/rollback can break the physical audit | Back up manifests/files as well as relational links. Test restoration and additive migration rollback behavior; preserve old job semantics and irreversible ledger history. Define measured recovery objectives with the deployment owner rather than claiming them now. | Restored accepted lot still identifies its file, release, inspector, location and installation; old clients cannot bypass new gates. |

Add G16: actionable role-aware UX, notifications and context continuity. Add G17: file/connection lifecycle and operational hardening. These are amendments to all delivery stages, not polish to postpone until after rollout.

Additional integrity rules from this pass: output inventory identity must match the released part/revision or an explicit approved mapping; a kit must satisfy its actual approved component requirements, not merely contain any accepted batches from the project. Check quantity, revision compatibility, accepted disposition and destination at issue/install time. Cross-project transfers need both authorized scope and real ledger movement. Test a valid but wrong accepted part as a negative case.

For file revocation, an already issued signed URL may remain usable until expiry. Use authorization-checked delivery where immediate enforcement is required, otherwise short expiry with the residual window documented; clear protected app caches on sign-out. Do not promise recall of already downloaded files.

### Remaining provider and team-validation questions

These are specific feasibility or pilot inputs, not reasons to ask the user to redesign the system:

1. Which materials/custom properties/drawing associations are populated in the actual team documents? Read representative examples and supply a mapping review; never assume fields exist.
2. Which drawing/geometry export endpoints honor the required version/configuration with the existing grant and plan? Test read-only capability; if broader authorization is needed, present exact scope and purpose separately.
3. Can webhook subscriptions be registered with current permissions, and what quotas apply? Validate notification authentication/lifecycle and use clearly labeled fallback checks if unavailable.
4. Which existing practical qualification and review policies apply to the team's machines? Prefill from existing records; team confirms real requirements, not generic invented certifications.
5. What is the representative complete subsystem/robot and pilot cohort? Include student, leader, stock/buyer and reviewer perspectives. Real physical evidence belongs to the team; do not fabricate it to finish software acceptance.

### Final acceptance gate additions from both reviews

- Cross-robot/spare allocation, stock assemblies, remnants, pack conversions and cancellation tests.
- Partial-lot conservation and replacement work, including stale/duplicate/multiuser requests.
- Source/drawing revision mismatch, archived/deleted source, quota/failure, missed/out-of-order notifications and reconnect.
- Membership revocation, unauthorized direct download and private analysis isolation.
- Specific-request deep links, notification deduplication, review bottleneck and owner-handover journeys.
- File/record restoration, migrated old jobs and older APK/client behavior against new server rules.
- Observed pilot usability: student finds assigned job, correct instruction and next action without a leader explaining database structure. Test this with a new student, not only a developer.

## 12. Scope conclusion and handover rule

### Direct-entry follow-up review

User approved a dedicated Work → Robot Build entrance and requested another analysis. Reviewed its consequences for existing project/task links, build scope, setup and multi-role navigation. Source confirms existing CAD/job/installation links use /projects with project/task/build parameters; preserve those links. These amendments are proposed, not shipped.

1. **One canonical workspace:** the new entrance must open a dedicated workspace layout, not redirect users to a project card where they still expand Robot Build. Projects shows a summary and Open Robot Build link; both use identical records and permissions. Old deep links resolve to the corresponding context; general project tasks remain valid. Refresh, browser Back and post-login return retain the exact authorized build/item.
2. **Persistent context:** show build name and selected subsystem in the header on every work page, including fullscreen and phone. A link to another build opens its explicit target, never the last-used build. Changing build with unsaved input offers save-draft/discard/stay; it cannot carry a quantity or selection to the new build. One accessible active build opens directly; multiple builds have a compact chooser and explicit current selection. Archived builds remain searchable read-only and are not the default.
3. **Setup without duplicate projects:** first setup offers existing eligible projects first. Only authorized leaders can explicitly create a project when needed. New Onshape imports offer the same build/subsystem picker and detect already linked source scopes. Existing build records appear automatically; do not require re-importing CAD or recreating jobs to use the new entrance.
4. **Separate design and execution destinations:** CAD Mentor is where design analysis happens; Robot Build is where approved work is executed. From a part, Review design opens the exact authorized source/revision; resulting issues link back to the same requirement/job. A contextual handoff must not imply students receive private CAD or AI permission. Inventory and Purchasing retain their own management screens; build panels offer scoped actions, not duplicate editing interfaces.
5. **Subsystem is a filter, not another navigation layer:** default Parts to all subsystems, with a visible filter and accessible counts. Permit component/prototype builds and manual requirements without a full-robot assembly or invented subsystem hierarchy. Moving a part to a different subsystem is a grouping/demand decision, not automatically a new job or stock movement.
6. **Different jobs, same screen language:** bought components show purchasing/receipt actions, made parts show operations/inspection, and reuse shows eligibility/allocation. Do not put bought items through a fictional manufacturing route. Show current status plus one primary action and secondary eligible actions; never hide a needed alternative such as Report problem or Open drawing just because a next-action rule picked another action.
7. **Review work across builds:** existing Home/My work and review entry points aggregate authorized assignments across builds so a reviewer need not visit every robot. Within Robot Build the queue is clearly scoped to the current build, with a link back to the existing all-work view. Counts must identify their scope and count distinct actionable items, not duplicated issue appearances.
8. **Small-team and inherited-role behavior:** a leader who manufactures can use My work and management views without changing accounts. Setup checks missing reviewer/stock responsibility and offers assignment to an eligible existing person; it cannot silently grant permissions. Preserve required independent review; no available reviewer becomes an explicit blocker with a resolution path, not an approval bypass.
9. **Receipt plus handoff:** after submission show the resulting quantity/state and next owner, e.g. Awaiting inspection, with due date only when recorded. After approval show where accepted parts should go. If no storage/bin is configured, request the required location at the appropriate stock step; do not let work end with an unexplained Done. Technical failures retain entered data and a safe retry path.
10. **Progress scope labels:** CAD checked is not manufacturing approved; manufacturing accepted is not installed; installed is not tested. Show source freshness next to CAD context and physical readiness next to build progress. Zero due inspections in one build does not mean the reviewer has no work elsewhere.

Acceptance additions: existing populated build opened without migration-by-user; old CAD/job links and post-login return; Back from specific purchase preserves part/filter; two active builds with unsaved input; archived target; no full assembly; mixed bought/made/reused parts; cross-build reviewer inbox; leader who also manufactures; no eligible reviewer; failed save and retry. Walk these in a reviewable prototype before calling navigation validated. This review refines G01/G07/G16; it does not add new primary tabs or a new phase.

### Additional discoverability review requested by user

Method: checked entry, first use, repeat use, exception recovery and return navigation for student, leader, designer, reviewer and stock/buyer; compared the proposed navigation with current ProjectBuildWork and ProjectTaskReview disclosure/configuration paths. This is source/design analysis, not observed user usability testing. Amendments below supersede earlier navigation wording where different.

**Entry correction:** keeping records in Projects does not require making users navigate four levels. Add a visible **Robot Build** shortcut within the existing Work navigation to the same project-backed workspace. With one accessible active build, open it directly; with several, show a compact recent/active build chooser. With none, show leader setup or student “No build assigned” with the responsible project contact when known. The existing project has an “Open Robot Build” action, not a collapsed manufacturing section as the sole entrance. Preserve existing links. Do not add a duplicate top-level product or duplicate records.

**Navigation correction:** four primary views: Overview, Parts, Workshop, Assembly & tests. Activity remains a consistently labeled secondary link, alongside Build details. Pending decisions must surface in Overview and their related view; nothing actionable is discoverable only through Activity. CAD changes appear as “Changes to review (n)” in Parts and Overview. Workshop offers visible My work / Team work / Inspections filters as authorized; do not bury inspection under a generic More menu. No required action inside nested accordions.

| Person / intent | Visible entrance | Destination/action |
|---|---|---|
| Student: continue work | Home assigned work or Work → Robot Build | Current operation with instructions already visible |
| Student: help without an assignment | Workshop → Available work, only where policy allows | Request assignment; authorized claim only if explicitly supported; never self-authorize restricted work |
| Leader: start or change build setup | Robot Build empty state / Build details | Guided setup or existing identity/source/owner details, without opening a task review |
| Designer: import or review change | Parts → CAD sources / Changes to review | Scoped source connection or candidate-versus-release review |
| Leader: add non-CAD item | Parts → Add part | Add manual requirement with provenance; no Onshape prerequisite |
| Leader: assign manufacture | Selected part → Prepare work | Release/instructions/assignment in one guided flow |
| Reviewer: inspect | Home review item / Workshop → Inspections | Exact lot and criteria with permitted decision actions |
| Stock/buyer: resolve shortage | Overview shortage / selected part → Resolve shortage | Reserve, request stock, or exact existing purchase according to authority |
| Assembler: fit/replace component | Assembly & tests → kit/installed component | Relevant installation or replacement action with exact configuration |
| Any authorized user: find part | Parts search; Workshop search for jobs | Search names, part numbers and labels within allowed scope; no new enterprise-wide search required |

**Part detail hierarchy:** header (name, revision, status), immediately visible relevant drawing/instructions or sourcing information, primary next action, then Details/History. “Progressive disclosure” means hiding rarely needed provenance/edit settings, not hiding the files or action needed to do the job. In Parts, row selection shows the preview/detail beside the table; in Workshop, the current operation occupies the main view. Closing returns to the same filter/scroll. No drawer-inside-drawer chain; complex work gets a dedicated page with a clear return link.

**Permission visibility:** hide irrelevant admin controls, but explain unavailable steps necessary for the user's task with a responsible role and valid request action. Do not reveal inaccessible project/source names or counts. “Waiting for material — request from inventory owner” is useful; a disabled Reserve button without explanation is not. Delegation/reviewer absence points to an authorized leader; no new permission bypass.

**Empty and stalled states:** distinguish no records, active filters hiding records, insufficient access, missing setup, provider/loading failure and genuinely finished work. Each has a specific next action. A student with no assignment must not see “all done” if unassigned work exists. Saved drafts show Continue setup, not a second Create action. A pending export shows status and retry when appropriate, not an empty drawing panel.

**Terminology:** use Buy (purchased parts), Make, Reuse; explain COTS as an optional technical synonym. Use “Approved instructions,” “Awaiting inspection,” “Stored,” “Installed,” and “Test required” for the appropriate state rather than a universal Done. Required/available/short quantities have inline units. Technical IDs and snapshot terminology remain in provenance. Button labels state outcomes: Prepare work, Request material, Submit for inspection, Record installation; avoid generic Record action.

**Visual economy:** adopt the user's compact list reference. Default columns are part, material/process, required quantity, status/next action. A sourcing view may add coverage/shortage; do not show all proposed columns simultaneously. Keep a small actionable summary; model/detail appears on selection. Four primary navigation views do not imply four always-open panels. Desktop inputs/buttons align; phone primary actions remain visible above safe areas and keyboards without hiding content. Do not add a global floating assistant that covers workflow controls.

**Discoverability acceptance targets (proposed, not achieved):** from Home an assigned job opens in one selection with the current instruction and action visible; from Work the sole active Robot Build opens in one selection; routine work needs no nested disclosure; a leader finds Build details without entering a task; reviewers find Inspections without visiting individual projects/tasks to search for submissions. Validate these with representative new student/leader users on phone and desktop, including Hebrew, no assignment, missing permission and interrupted work. Click targets measure navigation only, never compress necessary approvals into unsafe one-click actions.

This review extends G01/G07/G16; it adds navigation and empty-state acceptance requirements, not another implementation phase. No production UI changes have been made.

The integrated core is delivered. G01–G17 describe remaining completion work or extensions, not seventeen entirely absent systems. Proposed additions above have not been built by writing this document. Retain exact current-release boundaries and evidence.

The reviewed design is a coherent development contract with known feasibility checks. Do not claim no possible gaps, complete native Onshape parity, automatic engineering certification, instant synchronization or guaranteed robot performance. Re-run the scenario matrix against each implementation increment, record new discoveries, and mark delivered only with evidence. No production changes were made in this design review.
