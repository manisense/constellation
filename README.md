# OurSpace (Constellation)

OurSpace is a private romantic digital world for exactly two partners.

It is not a social app, not a public platform, and not a dating app.
It is a pair-only shared home where partners talk, play, remember, and grow together.

## Product Docs

- Product vision and enhanced concept: `project.md`
- Mandatory implementation guardrails for agents: `AGENTS.md`
- Copilot-specific coding constraints: `.github/copilot-instructions.md`

## Tech Stack

- React Native 0.72 + Expo modules
- TypeScript
- NativeWind (Tailwind-style utility classes for React Native)
- React Native Reanimated (motion + micro-interactions)
- Supabase (Auth, Postgres, RLS, Storage, RPC)
- 100ms (1:1 voice/video transport)
- OneSignal (push notifications)
- Resend (transactional email)
- Android native install flow via Gradle + ADB (no Expo Go)

## Setup

### 1) Install dependencies

```bash
npm install
```

When native dependencies change (e.g., OneSignal), run:

```bash
npx expo prebuild
```

### 1.1) UI styling foundation

- NativeWind is preconfigured via `babel.config.js`, `metro.config.js`, `tailwind.config.js`, and `global.css`.
- App entry imports `global.css` in `App.tsx`.
- Use `className` on React Native components for utility styling and keep theme consistency with shared tokens.

### 2) Configure Supabase

Set environment values (recommended in `.env` / EAS env):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

`src/utils/supabase.ts` requires these variables and fails fast when missing.

### 3) Configure service providers

Set environment values for planned production integrations:

- Client-exposed
	- `EXPO_PUBLIC_ONESIGNAL_APP_ID`
	- `EXPO_PUBLIC_API_BASE_URL`
- Server-only
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `RESEND_API_KEY`
	- `RESEND_FROM_EMAIL`
	- `HMS_ACCESS_KEY`
	- `HMS_SECRET`
	- `ONESIGNAL_REST_API_KEY`
	- `ONESIGNAL_APP_ID`
	- `REDIS_URL` (phase-2 scaling)

### 4) Initialize database

Run in Supabase SQL editor:

- `final_supabase_setup.sql`

If needed for existing databases:

- `fix_constellation_members_rls_recursion.sql`

### 5) Enable auth providers

In Supabase dashboard:

- Enable Email provider
- Enable Google provider and set callback URL correctly

## Android Run (Primary Dev Flow)

```bash
npm run android
```

This orchestrates Wi-Fi ADB connect, Metro startup, Gradle debug install, app launch, and logs.

## Core User Flows (Current)

- Auth -> Create/Join constellation -> Waiting for partner -> Shared Room entry
- Shared Room routes to Chat, Daily Ritual, Love Timeline, Date Plans, Memories
- Communication includes text/media chat, lightweight voice note action, voice call, and video call sessions
- Chat sends and call ring starts enqueue pair-scoped notification events in `notification_outbox`
- Couple Play + Watch Together are pair-private sessions backed by constellation-scoped state
- Settings includes backend-backed requests for account data export and account deletion
- Settings includes backend-backed notification preference toggles (push/email)

## Supabase Notes for New Modules

- Run `final_supabase_setup.sql` to provision pair-only tables/policies for:
	- `room_states`
	- `daily_ritual_entries`
	- `timeline_chapters`
	- `call_sessions`
	- `couple_sessions`
	- `account_data_requests`
- Storage buckets/policies include `chat-images`, `memories`, and `voice-notes`

## Push Outbox Dispatcher (Edge Function)

- Dispatcher source: `supabase/functions/notification-dispatcher/index.ts`
- Claims queued rows via `claim_notification_outbox`, sends via OneSignal REST API, and finalizes via `complete_notification_outbox`
- Input body (optional): `{ "batch_size": 20 }`
- Health check: `GET` on the same endpoint returns queue counts by status and oldest pending age
- Health check also reports `status`, alert thresholds, and `alerts` when limits are exceeded

Deploy and invoke:

```bash
supabase functions deploy notification-dispatcher
```

```bash
supabase functions invoke notification-dispatcher --body '{"batch_size":20}'
```

```bash
supabase functions invoke notification-dispatcher --method GET
```

Optional dispatcher alert thresholds (function env):

- `NOTIF_ALERT_PENDING_AGE_SECONDS` (default: `300`)
- `NOTIF_ALERT_FAILED_COUNT` (default: `20`)
- `NOTIF_ALERT_QUEUED_COUNT` (default: `100`)

Recommended: run this function on a schedule (e.g., every minute) using your Supabase scheduling approach.

Scheduler helper SQL:

- `supabase/sql/setup_notification_dispatch_scheduler.sql`
- Replaces placeholders for `<PROJECT_REF>` and `<SERVICE_ROLE_JWT>` before running
- Do not store real keys in committed files; execute with local/private values only

## Project Structure

- `src/screens` — feature screens
- `src/navigation` — auth/app routing
- `src/provider` — auth/session/status context
- `src/components` — reusable UI primitives
- `src/utils` — Supabase and utility helpers

## License

MIT