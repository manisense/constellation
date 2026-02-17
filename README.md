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

Update project URL and anon key in:

- `src/utils/supabase.ts`

### 3) Initialize database

Run in Supabase SQL editor:

- `final_supabase_setup.sql`

If needed for existing databases:

- `fix_constellation_members_rls_recursion.sql`

### 4) Enable auth providers

In Supabase dashboard:

- Enable Email provider
- Enable Google provider and set callback URL correctly

## Android Run (Primary Dev Flow)

```bash
npm run android
```

This orchestrates Wi-Fi ADB connect, Metro startup, Gradle debug install, app launch, and logs.

## Solo Test Mode

When only one tester/device is available, use Solo Test Mode from waiting flow.

- Unblocks development for partner-dependent screens
- Keeps product vision pair-only while enabling local testing
- Sign-out clears solo mode state

## Project Structure

- `src/screens` — feature screens
- `src/navigation` — auth/app routing
- `src/provider` — auth/session/status context
- `src/components` — reusable UI primitives
- `src/utils` — Supabase and utility helpers

## License

MIT