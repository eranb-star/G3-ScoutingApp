# Studio import access and Hebrew match scouting — 14 November 2026

## Requested scope

- Move Onshape import above the Studio canvas and catalogue; retain the existing connected-source, exact-snapshot, geometry and save behavior.
- Match scouting must follow the app language, including the live 2026 template's headings, questions, options, help and feedback.
- Focused frontend release only. No database migration, permission change, CAD reimport, stored report rewrite or APK rebuild.

## Implementation

Studio now has a visible pink-accented **Import from Onshape / ייבוא מ־Onshape** section immediately below the design header. Browse connected designs, select a design/assembly, then import current revision. The previous bottom-of-catalogue disclosure is removed. Existing edit/lease/history/busy restrictions remain. The section is outside the scrollable library, works in focus/fullscreen, and stacks on phones. Imported changes still require Save version as before.

Match scouting and TemplateForm use LocalizationProvider. Template labels are translated only at render time; field IDs, select values, counters, raw templates, cached forms, report payloads and queue/upsert keys remain unchanged. Translation covers the production 2026 FUEL/HUB/TOWER vocabulary inspected in District Event 4 and supports explicit `label_he` / `labels.he` for future custom templates. Unknown custom labels retain source text rather than guessing. Official event names, team numbers and match identifiers remain unchanged. Hidden-field filtering still uses original IDs/labels.

## Focused verification

- `node scripts/test-scouting-localization.mjs`: passed Hebrew/English server rendering, RTL/LTR, selected raw enum values, counters, hidden fields, custom-label override, unknown fallback and unchanged schema/report.
- Local browser: Studio import appears above catalogue; scouting language switched with a selected team/station, counter and checkbox retained. Synthetic save succeeded; no production report submitted.
- Production template inspected read-only; production event selection used only to view its template.
- TypeScript and release pipeline: final status recorded below after completion.

## Release status

Implementation prepared; production promotion pending. Previous production remains 6836472 until verified promotion. No claim of a new APK or physical-device acceptance.
