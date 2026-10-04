# Filament inventory extension — 4 October 2026

User authorized extending existing Add part with a Filament category and dropdowns; the broader fundraising/print-production design remains a proposal, not implemented.

## Implemented
Existing Tools & Inventory → Parts & stock → Add part → Filament reveals material, brand, colour, finish, diameter, net spool weight, spool price in ILS, optional empty-spool weight and product URL. Common choices plus custom values; brand/model names are not endorsements. EN/HE labels and stable stored colour/finish values. Supplier, SKU, storage location and stock alerts reuse existing fields.

One inventory row represents a material/brand/colour/diameter variant, not an individually identified physical spool. Available stock and reorder threshold use kg, with available grams shown on the saved card. Cost per kg is calculated as spool price × 1000 / net grams. Price per gram is displayed without rounding it to currency cents. This is a reference spool price; purchase-lot cost history is not implemented. Existing non-kg stock cannot be silently relabelled as kg on conversion; create a separate filament item and reconcile existing stock deliberately.

## Database and tests
Apply `backend/supabase/filament_inventory_20261004.sql` before the frontend. Adds nullable constrained filament_details JSONB under existing inventory RLS. Seeds Filament category without overwriting existing category decisions. Widens stock and movement decimal scale to four kg decimal places (0.1 g), preserving ten integer digits; does not narrow the unbounded replenishment target. Existing non-filament rows remain valid.

Production schema inspected; migration dry-run with rollback passed, then committed successfully. No fabricated stock was inserted into production. PGlite tests cover migration rerun, invalid details, unit constraint, custom brand, 25 g precision and preservation of ordinary parts. Cost tests include 1 kg/750 g, zero price and invalid input. TypeScript passed. Browser fixture checked EN/HE, category visibility, custom brand, kg unit lock and cost recalculation; corrected field alignment when custom input appears. Production build passed. Authenticated live Add part → Filament verified all fields, kg lock and 80 ILS / 1000 g = 80 ILS/kg and 0.0800 ILS/g. Screenshot: docs/staging/filament-inventory-production-20261004.png (unsaved example). No production save/edit roundtrip was performed; persistence and constraints were tested in PGlite. Production Ready deployment EynTWPRirAQus5dH2uf8RJWtpqpr, source d8ca50f, aliased to g3-6740.com.

Implementation `040ab16`, release source `d8ca50f`. Rollback UI independently; additive metadata can remain. Do not revert precision by truncating existing values. APK unchanged (2.3.0 / 25).

## Still separate work
Physical spool IDs/counts, batch price history, print-product selector, stock reservations, print consumption, failure records, event sales and fundraising reconciliation are NOT implemented here. Existing Use/Receive actions remain manual. Reuse these inventory records for the future production workflow; do not claim automatic print-stock deduction already exists.


## Spool quantity correction
The original kg-only input confused the user. Add part now asks number of full spools (whole units) plus optional combined remaining grams in opened spools, computes kg from the selected net spool weight, and saves that calculated stock. + Receive for existing filament uses the same form and records the spool count/weight in the stock movement note. Existing stock stays unchanged until explicit receipt; editing metadata does not reset stock. Physical spool identities are still not tracked. Purchasing/finance receiving remains its existing quantity flow; this correction covers Add part and inventory + Receive.
TypeScript and filament conversion/SQL regression tests passed. Browser fixture: 8 × 500 g = 4 kg; receiving those into 2 kg produced 6 kg. No fabricated production stock was added.
