# Academy UX proposal — review only

Figma Starter MCP quota blocked new screens after read-only discovery. User accepted an interactive local prototype instead. File: apps/dashboard_web/scripts/designs/academy-review.html. Serve through the existing Vite preview on port 4252. Query parameters support lang=he, role=mentor or leader, view=instructor.

Proposed navigation: My learning (default next action/assigned learning/feedback), Explore (library and existing real CAD), My progress. Instructor workspace groups courses/assignments, cross-course review queue, team progress and course creation. Publish and assign remain separate; team leader scope and practical review permission remain separate. Robot trials belong primarily with engineering/reliability and are attached contextually to assignments.

Interactive examples cover lesson steps, feedback, draft fields, reference-tool dialogs, evidence attachment, instructor list, course builder/student preview and assignment dialog. All data is synthetic and actions affect only the page session. CAD/library/test dialogs illustrate integration; they do not contain the real CAD renderer or real persistence. No application/deployment/database changes are authorized by approval of this visual prototype alone.

Language requirement: show preferred-language course titles, instructions, questions, options, feedback and status labels consistently. Never concatenate English/Hebrew content. Existing TrainingCenterPage localizes course title/description on load, while generic assessment/review renderers still use raw fields; generated feedback also contains bilingual text. Production remediation must handle legacy separators and bilingual feedback deliberately, retain original content and quiz answer identity, refresh on language changes and label missing translations. Do not blindly translate learner-authored evidence or break grading by changing option values.

Verified prototype: English student next-step navigation, Hebrew RTL instructor view, Hebrew course-builder entry. This is not production functional acceptance. Physical/mobile device acceptance remains separate.
