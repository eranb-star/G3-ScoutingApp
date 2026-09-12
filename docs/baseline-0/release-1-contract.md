# Release 1 — proposed implementation contract

Status: design draft for owner acceptance, based on Blueprint V5.2. Not implemented by Baseline 0.

## Existing sources of truth

| Domain | Reuse / extend | Rule |
| --- | --- | --- |
| Identity and permissions | Team members, existing role/capability enforcement and Supabase auth | Server verifies every transition; QA sessions retain real QA permissions |
| Work | Existing projects/tasks and prerequisite links | One task status across Projects, Work, Home and Inbox |
| Reviews | Existing project review gates/submissions | Extend for stage-specific evidence and reviewer requirements |
| Notifications | Existing team actions and per-member states | Source state drives visibility; acknowledging a message never approves work |
| Physical evidence | Existing reliability/engineering features where suitable | Explicit exact revision and robot configuration links; never infer from task completion |
| Stock/purchasing | Existing inventory movements and purchasing records | No duplicate quantities or purchases introduced by engineering links |

The detailed current file-to-table/RPC references are in local-inventory.json; the actual foreign-key definitions are in live-catalog.json. Proposed entities below must be mapped to these before SQL is authored.

## Minimum complete engineering flow

Requirement and acceptance criteria → responsible project/task → versioned design/evidence → submitted review → authorized decision → physical validation → readiness → change-impact handling.

Each requirement has an owner, subsystem, measurable criterion, criticality and verification method. Each milestone identifies required reviewer roles, due date and upstream prerequisites. Ordinary tasks retain the current simple flow; review gates apply only where explicitly configured.

## Transition contract

| State / action | Who | Result |
| --- | --- | --- |
| Draft / in progress | Authorized task contributor | Editable work; reviewer assignment is planning, not a pending review |
| Submit for review | Actor with submit capability, excluding own review | Validate evidence, revision, prerequisites and reviewer configuration atomically; create immutable submission; notify reviewers |
| Request changes | Assigned authorized reviewer | Reason required; preserve evidence and decisions; contributor receives actionable status |
| Resubmit | Authorized contributor | New immutable revision; previous approval does not carry over silently |
| Approve stage | Required authorized reviewers | Decide against exact submission version; stage passes only after all required decisions |
| Reopen | Authorized actor | Reason and impact assessment required; affected downstream readiness becomes stale/blocked as appropriate |
| Emergency override | Separately authorized actor | Explicit scope, reason, expiry and audit; override is visible and never described as a normal pass |

Capability names in V5.2 (`submit_engineering_review`, `decide_engineering_review`, `reopen_engineering_review`, `authorize_engineering_override`) are proposed additions. Their actor mapping needs explicit policy acceptance; do not infer that all admins automatically satisfy engineering approval roles.

## Evidence and change control

- Submission records exact artifact revision/identifier, evidence links or stored files, submitter, timestamp and criterion coverage. Multiple artifacts must be supported. A mutable external URL alone is insufficient to establish the approved version.
- Review UI presents evidence directly, with version and permissions-aware access. Missing/inaccessible evidence prevents an ordinary approval; explanatory errors preserve the draft.
- Approvals bind to exact revision and stage. Changing evidence, criteria, interfaces or physical configuration triggers explicit impact handling, never silently preserves stale approval.
- Dependency cycles are rejected. Downstream task completion cannot bypass an unresolved required gate. Existing completion/deletion/archive synchronization remains authoritative across screens.
- Physical tests link to exact designed/approved/as-built/as-installed configuration as relevant, operator, procedure, result and evidence. Failed or unperformed tests cannot become passes through task completion.
- All critical requirements must pass or have an applicable authorized unexpired waiver. Waived and passed remain distinct in readiness totals.

## UI and consistency requirements

Home offers Open task/review and optional reminder actions, not task completion or approval shortcuts. Reviewers see pending review only after submission; future review commitments may appear separately with a clear planned label. Contributors see a prominent Send for approval action and reason when unavailable. Pending review is distinct from complete. Buttons, validation, Hebrew/English text, responsive layout and empty states follow the established app design.

Use atomic server transitions, idempotency and expected-revision checks. Reject conflicting stale decisions with a refresh explanation. Notifications are deduplicated by source/revision/recipient. Offline submissions remain visibly pending and never unlock dependent work until accepted by the server.

## Required acceptance scenarios

1. CAD contributor submits exact evidence; assigned mentor reviews; Mechanical unlocks only after the required stage passes.
2. Electronics → Software uses the same flow without Business & Outreach navigation.
3. Self-review, wrong reviewer, unauthorized cross-team edits, stale decisions and dependency cycles are rejected server-side.
4. Changes requested → resubmission preserves history; changed revision cannot reuse the old approval.
5. Reopen/deletion/archive updates Projects, Work, Home and Inbox consistently without duplicate notifications.
6. A failed physical test blocks readiness; a valid scoped waiver is visibly distinguished and expires correctly.
7. Offline/retry produces one accepted transition; draft/evidence survives validation failures.
8. Mobile and desktop evidence/submission/review controls are usable; QA account switching returns to the initiating admin.

Use synthetic data in isolated staging. Run focused tests for these changes, then one consolidated preview acceptance and APK release. Full CAD integration, simulation and broad historical import are later releases and must not expand this first engineering loop.
