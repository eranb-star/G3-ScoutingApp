# G3 Scouting System (Monorepo)

Cross-platform FRC scouting system:
- **Mobile**: Flutter (offline-first, auto-sync)
- **Dashboard**: React + TypeScript
- **Backend**: Supabase (Postgres) + scripts (TBA import)

## Repo structure
- `apps/mobile_flutter`
- `apps/dashboard_web`
- `backend/supabase`
- `backend/scripts`
- `docs`

## Quick start
### Backend (Supabase)
Run:
- `backend/supabase/schema.sql`
- `backend/supabase/rls_policies.sql`

### Mobile (Flutter)
```bash
cd apps/mobile_flutter
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run
```

### Dashboard (React)
```bash
cd apps/dashboard_web
npm install
cp .env.example .env
npm run dev
```
