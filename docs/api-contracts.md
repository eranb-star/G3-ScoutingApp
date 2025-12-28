# API Contracts (v1)

We use Supabase Postgres tables directly via SDK.

## Tables
- events, teams, matches, scout_entries, form_templates, picklists

## Mobile upload
- Upsert into `scout_entries` by `id` (UUID generated on device).
- Duplicate detection is server-side (by event_id+match_id+team_number).

## Dashboard reads
- Reads `teams`, `matches`, `scout_entries` for selected event.
- Computes metrics client-side (v1).
