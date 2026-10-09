# Compact reminders and Team Operations — 9 October 2026

Implemented locally; not deployed by this change. Robot Build/CAD/CAM functionality is unchanged.

- Home and Work reuse compact reminder rows with visible date/time, expandable descriptions, touch-sized actions and width-aware layout for narrow panels/phones. Home shows four initially, Work six, with explicit expansion.
- Remind me later offers 1/3/7/14/30 calendar days or a future local date/time. Existing per-member team_action_states stores the UTC instant; no schema or permission changes. Source deadlines/event dates are unchanged. Deferred items can be rescheduled or brought back in Work. The list reevaluates expiry every 30 seconds and refreshes on focus/cross-tab updates.
- Far-future meetings no longer bypass Home's seven-day horizon solely because their stored priority is high. Urgent non-meeting work retains prior priority behavior.
- Reminder completion is labelled Dismiss reminder, not completion of the underlying event/work. Project tasks still open their source. Existing Home overdue/critical signal protection remains.
- Team Operations has its own /team-operations destination in the web navigation and native More menu, with a compact Work shortcut. Existing destinations and permissions remain. Operations child pages return to Team Operations.

Verification: TypeScript and Vite build pass (existing chunk-size warnings). Reminder tests cover meeting horizon, urgent assignments, defer expiry, restoration, invalid/past custom input and local calendar presets. Existing readiness and absence checks pass. Synthetic browser preview verified defer/restore and original-date retention; EN desktop and HE 390px layout inspected, Operations destinations inspected. No real member data modified.

The legacy verify-phase-1-2 source-string checker has a pre-existing Skills Academy scope-expression mismatch; TrainingCenterPage was not changed in this work. This is not an all-suite pass claim. No APK rebuilt or production deployment performed.

Preview: node scripts/preview-reminders.mjs from apps/dashboard_web. Synthetic data only; query parameters home=1, lang=he, operations=1 and fail=1 support review. Preview state is session-local, production reminder state remains Supabase-backed.
