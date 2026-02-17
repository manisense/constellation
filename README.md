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

## Project Structure

- `src/screens` — feature screens
- `src/navigation` — auth/app routing
- `src/provider` — auth/session/status context
- `src/components` — reusable UI primitives
- `src/utils` — Supabase and utility helpers

## License

MIT