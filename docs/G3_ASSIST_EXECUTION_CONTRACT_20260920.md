# Stage 1 execution contracts — budget and team purpose

**Latest controls continuation:** [Implemented controls and hosted QA evidence](G3_ASSIST_CONTROLS_20260920.md). Admin spending UI, semantic-purpose gate and durable request recovery/cancellation are implemented locally. Three control migrations and rollback-only acceptance passed in isolated QA; policy remains disabled at $25. No production deployment, billing change or paid call. This checkpoint supersedes older pending-implementation wording below; remaining release gates are explicit in the linked document.


**2026-09-20 budget decision:** user selected **$25 USD per month total team API usage**. [Budget implementation checkpoint](G3_ASSIST_BUDGET_20260920.md): backend reservation ledger is implemented and locally tested, disabled by default and not yet connected to the assistant. Warning thresholds are $20/$23.75. Hosted rollout, coordinator/purpose integration and paid activation remain pending; this amount is not authorization to activate billing now.

Status: implementation contract, not an active production control. The role gate is implemented locally; the coordinator, monetary reservations and relevance classifier described here must be implemented and tested before enabling the expanded paid assistant. This document does not claim that the old provider handler already enforces these controls.

## Request and response

Client supplies `requestId` (UUID), `conversationId?`, `message`, `contextIds[]`, `attachmentIds[]`, and `mode` (`standard` initially). Identity, role, team, effective permission and budget scope come from authenticated server state. Reject unknown modes/tools/provider overrides. Limit prompt bytes, attachment count/bytes and context IDs before any external call. Attachments are authorized private objects, not arbitrary fetch URLs.

The server returns `executionId`, state, allowed progress messages and a typed error. Repeated `(memberId, requestId)` with the same input hash returns the same execution; different input with that key returns conflict. Conversation writes and usage recording have independent retryable persistence. A failed save cannot erase charges or cause a second generation automatically.

States: `received → checking_scope → needs_clarification | declined | queued → retrieving → generating → validating → completed`. Any running state can terminate as `cancelled` or `failed`. State transitions use compare-and-set against the current execution version; terminal states cannot reopen. A user-requested retry receives a new request ID only after showing prior execution status. Reconnect resumes observing the existing execution.

## Purpose decision

Server policy input: current question, bounded prior context, authorized linked task/issue metadata, requested mode/tool and policy version. Source excerpts/attachments are explicitly untrusted data. Output schema:

```
decision: allow | clarify | decline
category: engineering | frc_rules | scouting_strategy | team_learning |
          team_operations | ambiguous | unrelated | disallowed_tool
reasonCode: bounded server-enumerated code
clarification: optional short localized question
```

Use deterministic rules for unsupported tools and obvious protocol violations; use a bounded classifier for semantic relevance when needed. Never equate an FRC keyword with authorization. Classifier output cannot grant permissions, tools, higher budgets or source access. Invalid/failed classification yields a safe unavailable/clarification state, not unrestricted generation. Check every turn and before an added tool step. “Explain torque” is valid team learning; an unrelated request prefixed “for FRC” is not necessarily valid. Scope checks cannot substitute for general safety or evidence validation.

Clarification/decline responses are short templates where possible. Classifier calls consume a separate capped allowance plus the shared monetary budget. Proposed anti-abuse limit: at most five submitted attempts per member per minute, including declines, configurable downward to provider limits. Repeated irrelevant attempts receive a cooldown; no automatic disciplinary record or role change. Administrator override is task-scoped, expires, is audited and cannot enable prohibited tools.

## Budget reservation

Amounts use integer micro-units of currency, with explicit currency and versioned prices; do not perform monetary arithmetic with floating point. Budget dimensions: team/month, team/day, member/day and execution maximum. All are configured by authorized administrators. Unset required budget/provider price or account configuration fails closed. Warning thresholds 80% and 95%; no new paid step past the hard cap.

Within one database transaction, lock budget rows in a deterministic order, check active membership and `use_g3_assist`, create/reuse the idempotent execution, and reserve the upper bound for the next step. A reservation counts against every applicable dimension. Record provider/model/tool, token/step ceilings, price version, reservation ID, start deadline and input hash. Do not keep a database transaction open during provider networking.

Steps: classifier, query embedding if enabled, answer generation, explicit web search, and permitted retry. Each step reserves before invocation. Initial answer mode: up to 6,000 retrieved-context tokens; total input cap also includes instructions, user message and bounded history; 2,000 billed output-token cap; 45-second execution deadline; at most one retry inside it. Exact cost estimation must use the selected provider's billing semantics and caps, including reasoning/image/tool charges. If a tool cannot be bounded, do not expose it in standard mode.

Attempt states: `reserved → dispatched → settled | uncertain`; a never-dispatched reservation can be released. Persist dispatch intent before the network call. Worker loss/timeout after possible dispatch marks usage uncertain and retains the reservation for reconciliation; never assume a lease timeout means zero provider cost. Successful or failed billed attempts record provider usage/request IDs separately from chat saving. Settle unused reservation only when cost is known; flag over-reservation estimates that prove insufficient, record actual cost and stop further work. Provider billing remains the financial authority; application caps can bound authorized calls but cannot retract already incurred charges.

Enforce provider-wide RPM/TPM/day pacing and concurrency separately from money. One active request per member and three provider calls per team are initial maxima, reduced by account limits. Queue fairly with bounded wait and visible position/status. No unbounded retries or four-model traversal. 404/configuration/auth failures stop; hard quota failures pause paid steps; transient 429 honors Retry-After; 503/timeout gets at most the bounded retry. Circuit breaker opens on repeated failures and reports operator action needed.

Cancellation atomically marks execution, prevents new step dispatch and aborts active networking where supported. An in-flight provider call can still incur charges; reconcile it. Permission revocation or inactive membership blocks queued work and retries. User-facing UI acknowledges cancellation promptly without falsely claiming the provider charged nothing.

## Allowed tools and outputs

Allow only authorized retrieval, approved unit-aware calculations and bounded web lookup. No image generation, arbitrary SQL/shell, CAD edits, robot control or automatic task creation. Robot-photo analysis is a generation input with its own privacy/size checks. Web queries omit private team details unless the destination/data use is explicitly authorized. Provider failover never silently widens data recipients.

Validate citations against returned authorized IDs/revisions and applicable season/version. Return facts, measurements, hypotheses, proposals and calculations separately. Resolve malformed/unsupported final answers through one budgeted correction only if included in the execution allowance; otherwise return a clear incomplete result with sources. Source-support evaluation remains separate from syntax validation.

Save knowledge creates an unverified draft; creates issue/task only through an explicit existing user action and destination authorization. No output can change its own review state or override costs/roles.

## Required tests before integration approval

Concurrent last-budget requests; duplicate request IDs; changed-body idempotency conflicts; classifier flood; incorrect purpose classification and correction; permission revoked while queued; paid permission absent during semantic search; provider errors by category; interrupted dispatch; uncertain charges; save failure after generation; cancellation race; stale price config; exhausted team versus member budget; unauthorized citation/cache content; malicious source instructions; prohibited tool injection; and live model compatibility with a bounded approved test budget.

These are Stage 1 contracts. Stage 3 must wire and validate the coordinator before any assertion of enforced monetary or semantic-purpose controls.
