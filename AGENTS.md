# Repository continuity

Before changing this project, read docs/CURRENT_CHECKPOINT_20261009.md and docs/WORKING_EXPECTATIONS.md. Then inspect only the feature records relevant to the current user request. These records do not authorize unrelated new development.

Match verification to the change. Documentation-only work needs a diff/link check, not builds or regression suites. Small edits need focused checks; reserve broad regression for relevant shared/high-impact changes. Honor required CI gates and do not silently weaken them. Batch work and avoid redundant pushes, polling and paid calls.

Preserve unrelated working-tree changes, credentials and ignored local assets. Distinguish implementation, deployment and physical validation. Update the authoritative checkpoint when status or user decisions change; superseded release notes are history.
