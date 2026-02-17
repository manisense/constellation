# Constellation

Constellation is a relationship-focused React Native app where two users form a shared "constellation" and build connection through chat, memories, date plans, and quiz-driven star archetypes.

## Project Idea

The core product idea is: **turn relationship habits into a shared, visual progression system**.

- Two users connect through an invite code.
- They unlock a shared space (chat + activities).
- Their constellation evolves as they interact.
- Personality/quiz outcomes (Luminary/Navigator) personalize the experience.

## Current Product Understanding

The app is structured around 4 lifecycle states returned by backend status RPCs:

- `no_constellation`: user signed in but not connected.
- `waiting_for_partner`: user created constellation and is waiting.
- `quiz_needed`: both users connected, quiz flow required.
- `complete`: full app flow unlocked.

Main modules currently implemented:

- Auth: email/password + Google OAuth (Supabase).
- Constellation management: create/join via invite code.
- Chat: realtime-style message flow and image support.
- Date plans and memories.
- Profile and star type metadata.

## Tech Stack

- React Native 0.72 + Expo modules
- TypeScript
- Supabase (Auth, Postgres, RLS, Storage, RPC)
- Android native install flow via Gradle + ADB (without Expo Go)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure Supabase

Set your project URL and anon key in:

- `src/utils/supabase.ts`

### 3) Initialize database schema

Run this once in Supabase SQL editor:

- `final_supabase_setup.sql`

If your database was already initialized previously and you need the RLS recursion hotfix, run:

- `fix_constellation_members_rls_recursion.sql`

### 4) Auth provider setup

In Supabase dashboard:

- Enable Email provider.
- Enable Google provider and set callback URL to your Supabase auth callback.

## Running on Android (Wi-Fi, native install)

```bash
npm run android
```

This workflow:

- connects ADB to device over Wi-Fi,
- installs debug APK via Gradle (`installDebug`),
- launches app via `adb shell am start`,
- starts Metro/log stream.

No Expo Go is used.

## Single-Device Development Mode

When only one device is available, you can continue feature testing using **Solo Test Mode** from the waiting screen.

- It unlocks app navigation for core feature development.
- It avoids partner-required blocking states during local iteration.
- Sign out clears solo-mode session state.

## Project Structure

- `src/screens`: app feature screens
- `src/navigation`: auth/app stack routing
- `src/provider`: auth/session/status context
- `src/components`: reusable UI primitives
- `src/utils`: Supabase + helper logic
- `final_supabase_setup.sql`: canonical backend bootstrap

## Notes for Contributors

- Prefer backend status RPCs (`get_user_constellation_status`) over ad hoc status derivation in screens.
- Handle no-row membership queries with `.maybeSingle()` where membership is optional.
- Keep navigation transitions stack-safe (avoid resetting to routes outside current navigator tree).

## License

MIT