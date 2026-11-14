# Meeting date safeguards — 14 November 2026

## Incident and scope
The Nov14 workshop was originally stored as Nov10. The module-level tomorrow default matched the saved wrong date but no historical audit proves which interaction caused it. The separate data repair is preserved; this release adds prevention without rewriting history.

## Delivered changes
- New official workshop requires explicit date; no module-load tomorrow default (including tabs left open overnight).
- Israel-time conversion shared with attendance corrections; invalid/ambiguous DST inputs rejected. Calendar editor no longer converts through device timezone.
- Full weekday/date/hours summary; explicit title numeric date or weekday mismatch warns and asks confirmation, never guesses a replacement date.
- Editing identified explicitly; New clears meeting identity; closing asks whether to discard or preserve the draft.
- Changing schedule displays before/after and explains existing absence decisions remain linked. All edits update existing IDs.
- Save reloads persisted meeting/calendar values; success includes date/time/cutoff/audience and link to saved event. Calendar update uses previous timestamps to reject stale edits.
- Additive audit triggers record creation and actual date changes with actor and before/after for calendar and workshop entities. Same-value updates produce no new date audit. Calendar and meeting entries are distinct linked entities, not duplicate records.
- Date moves blocked when attendance exists; changing only attendance cutoff remains supported. Existing open/closed guards, location restrictions, scheduler and absence filtering unchanged.

## Verification
Focused test script: apps/dashboard_web/scripts/test-meeting-date-safeguards.mjs. Passed timezone independence (Israel/Los Angeles/UTC), DST ambiguity/gap, Saturday14Nov vs Tuesday10Nov mismatch, explicit empty date/reset source guard, idempotent SQL application, audit creation/change/no-op, absence identity/status preservation, attendance move rejection and cutoff extension. TypeScript passed. Isolated actual-component Hebrew form showed blank required dates, mismatch warning removed after correct date, edited heading and before/after confirmation. Mobile390px had no horizontal overflow. English actual-component synthetic save also passed: persisted schedule/cutoff/audience and /schedule?event link shown, fields reset. No synthetic attendance or absence requests were submitted to production.

## Deployment
Migration meeting_date_safeguards_20261114.sql applied to production. Transaction compared hashes of all meeting, attendance and absence rows before/after: unchanged. Source **3e39e41**, release **5d3aabb** pushed. Required CI **404/405 passed**. Vercel preview **JBEzaLw8zL1MBj7QD8MWnz2kN5zy** Ready. Production promotion requested; blocked only at Vercel authenticator verification (user handoff, IAB tab8). Production web is still prior release until verification and final Ready/alias check. No repeat push/build required.

## Limits
Title parsing is a warning for explicit numeric dates and full weekday words, not general natural-language interpretation. A user may explicitly override when title refers to another date. No historical attribution is invented. No APK built; this request is web/backend. Physical attendance tests are unnecessary for unchanged check-in/out logic.
