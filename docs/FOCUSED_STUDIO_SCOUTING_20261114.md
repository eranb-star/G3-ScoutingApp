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
- TypeScript passed. Final source `aeaa6a8` and release `a59e46f`; required CI runs **424/425 passed** (initial 422/423 also passed).
- A mobile-only issue found during the visual check was corrected: Create design no longer automatically overlays the new import section with the parts drawer. Parts & tools remains available in the bottom navigation. Production at 390px confirmed drawer closed and import width 354.7px inside the viewport.

## Release status

**Deployed and verified:** production **a59e46f**, deployment **7pcsHhCLMGkJDNCgwaDbU4DFYCee**, Ready **20:28:26 Israel, 14 November**, on https://g3-6740.com after user authenticator verification. Preview was **4Qkpe1StFJPGkjaYR1LxXS41Mo3g**.

Fresh production tabs verified:
- Studio: import section visible above canvas/catalogue; Browse loaded 17 connected sources; selecting `chassis offseason · Assembly 1` enabled Import current revision. A new unsaved verification draft was used; no saved scene/BOM or source snapshot was changed. No unnecessary large geometry import was repeated for this UI-only relocation.
- Scouting: the real District Event 1 template renders Hebrew headings, questions, choices and placeholders from pre-match through post-match, including FUEL/HUB/TOWER. District Event 4 labels were inspected before implementation. No real report was submitted.
- Screenshots: `docs/staging/studio-import-top-production-20261114.png` and `docs/staging/scouting-hebrew-production-20261114.png` (local evidence, not committed).

No APK rebuild or physical-device acceptance is claimed. Rollback for this frontend-only change is previous production **6836472**; backend large-assembly fixes and stored data are unaffected. Final delivery documentation is committed locally without triggering another CI/deployment cycle.
