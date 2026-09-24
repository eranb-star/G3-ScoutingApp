# Official-document ingestion — 24 September 2026

User authorized completing official-document ingestion and deploying it together with the accepted Software Mentor UI. This extends Documents & updates / Check now, the existing corpus and G3 Assist. Log diagnosis remains deferred until representative robot logs are available.

## Delivered design

- Admin Check now discovers year-specific FIRST-hosted PDF/HTML links from configured season materials/playing-field pages. Configure a future season through the existing UI. No scheduler or frequent polling, no AI extraction charge.
- One bounded document per leased request; previous indexed revisions use HTTP validators. Unindexed/failed fingerprints are downloaded again so a 304 cannot prevent first ingestion. Existing resume, cancellation and failed-item retry remain.
- Pinned unpdf 1.4.0 extracts PDF text with original page locators; HTML uses heading/anchor locators. No PDF scripts, OCR, images or CAD interpretation. Bounds: 24 MB PDF, 128 MB per check, 80 documents, 250 PDF pages, 1.5 million extracted characters and 1,500 passages per document. Unsupported, image-heavy and failed documents are explicit attention items. Blank/diagram pages can be absent from text; consult originals for visual/table interpretation.
- Atomic service-only publication validates lease, records fingerprint/version, retires earlier corpus copies of the same URL and publishes all extracted chunks into the existing active generation. Failure after a changed valid response retires old indexed text rather than presenting it as current. Old versions/citations are retained. Repeat publication of a hash does not duplicate citations; counts reconcile with the generation contract.
- Search/selected-evidence resolution reuse existing RPCs and permissions. G3 Assist preferentially retrieves indexed official manual passages plus relevant supplements for the requested season; the existing live 2026 HTML fallback remains. English canonical manuals are authoritative for rule retrieval; translated manuals remain searchable. Missing future evidence is an explicit retrieval gap, not proof that the game is unreleased.
- UI distinguishes indexed passages from unindexed documents and reviewed interpretations. Search links retain season/source filters. Software Mentor code selection and question now share one compact composer, as accepted by the user.

## Validation / release tracking

Local tests passed for repeated migration, atomic publication, permissions, season isolation, stale-text retirement on extraction failure, retry deduplication, cancellation, generation count reconciliation, page/anchor locators and extraction bounds. Actual 166-page 2026 manual produced 188 page-linked passages. Existing corpus, source-check lease/security, assistant permission and official-season tests passed. Frontend TypeScript/build passed.

Production read-only preflight: active original corpus (1,716 sources / 48,797 passages / 50,157 citations); source/check tables had zero rows; relevant RLS enabled. Database size was 180,939,923 bytes at preflight (not a storage quota or future capacity guarantee).

QA migration applied and actual authenticated admin ingestion started against current FIRST pages; real manuals/checklists were indexed and an image-heavy build guide correctly reported insufficient extractable text. Final counts and production acceptance to be recorded after completion. Production additive ingestion and Software Mentor migrations applied successfully; release promotion in progress. Do not claim completion based on this checkpoint alone.

## Scope limits and rollback

The separate FIRST Q&A portal, OCR, CAD/video ingestion, exhaustive archival discovery and semantic verification of every extracted table are not delivered. Linked current official documents are supported; this is not a promise to discover every future publisher format or instantly fetch all internet knowledge. Existing community corpus is not reimported and extracted passages do not create reviewed robot configurations.

Rollback frontend/function together to the previous release if needed; additive schema can remain. Prior website source 875ea52 (Vercel A3xNMsgF3tGt7THHoGoxsiTKL1T8), prior assistant source recorded in START_NEXT_SESSION. Preserve downloaded manuals and deployment transports as ignored local artifacts. No changes to $25 budget, role grants, simulator or APK.
