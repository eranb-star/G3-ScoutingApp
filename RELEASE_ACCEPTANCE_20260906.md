# G3 Combined Release Acceptance

This release combines Skills Academy learning automation, production performance hardening, and preparation for the final multi-role acceptance run. It does not authorize deletion of QA accounts or data.

## Automated gate

- [ ] TypeScript and Vite production build passes.
- [ ] Phase 1–2, Phase 4–5, Phase 6, Skills Assessment, Skills Gradebook, and Learning Automation suites pass.
- [ ] Final web `dist` is copied into Android assets and both `index.html` files reference the same hashed bundle.
- [ ] Android release identity is incremented once for the combined release.
- [ ] Only product files are committed; Android Studio `.idea` files remain excluded.

## Admin / mentor acceptance

- [ ] Gradebook shows all permitted learners; students cannot see other students.
- [ ] Support queue identifies overdue, changes-requested, and attempts-exhausted learners.
- [ ] Reviewing written/practical work records feedback and updates the timeline.
- [ ] Requesting changes restores a student retry only when attempts remain.
- [ ] Passing all required modules and assessments produces qualification exactly once.
- [ ] Refreshing or reopening does not duplicate the responsibility notification.

## Student acceptance

- [ ] Due-soon and overdue work appears once in Home/Updates and deep-links to Skills Academy.
- [ ] Single-answer uses radio buttons; multiple-answer uses checkboxes.
- [ ] Failed attempts show the correct remaining count and permit retry when available.
- [ ] Changes-requested feedback is readable and the next submission creates a new attempt.
- [ ] My Progress shows only personal records and the full progression timeline.

## Cross-platform regression gate

- [ ] Desktop web, narrow web, and installed Android remain readable in English and Hebrew.
- [ ] Pit Scouting renders once and only its tab is active.
- [ ] Competition Quality remains card-based on phone.
- [ ] Active event context, navigation-to-top, Back behavior, and deep links remain correct.
- [ ] Offline competition data and queued submissions remain available after reconnect.

## Release boundary

Promote Vercel and create the signed APK only after the SQL migration has succeeded and this checklist has no release-blocking failure. Delete QA identities and records only after explicit product-owner approval.

