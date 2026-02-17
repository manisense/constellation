# OurSpace Product Blueprint

## North Star
OurSpace is a private romantic world for exactly two partners.
It must feel like a shared digital home, not a chat utility.

## Product Statement
OurSpace is a semi-immersive, emotionally polished, relationship-first app where two partners communicate, play, remember, and spend time together in one private space.

Not:
- social feed
- public platform
- dating discovery app

It is:
- a private, invite-only world for one couple
- a romantic daily-use product with progression
- a long-term memory and ritual engine for two people

## Emotional Promise
When users open the app, they should feel:
- “This is our place.”
- “We are building something together.”
- “Distance feels smaller here.”

## V1 Experience Core
### 1) Shared Room (Primary Entry)
Users enter a cozy shared room first, not a chat list.

The room evolves with relationship activity:
- couple avatars
- memory artifacts
- milestone decor unlocks
- gifts represented as room objects
- anniversary moments and seasonal ambience

Implementation direction (current build):
- room-first home is the default authenticated entry
- lifecycle is status/RPC driven (`no_constellation` -> `waiting_for_partner` -> `complete`)
- quiz is optional ritual/play content, not a hard gate
- solo mode is removed entirely

### 2) Romantic Communication Layer
Core communication:
- text chat
- voice messages
- call
- video call
- photo/video sharing

Romantic differentiators:
- custom couple emoji set
- synchronized “kiss/hug” micro-interactions
- lightweight heartbeat/presence moments
- virtual gifts that appear in room

Baseline delivered in core roadmap:
- text + image chat
- voice note lane in chat flow
- private 1:1 voice call and video call session flows
- pair-only call/session state persistence

### 3) Daily Love Rituals
- Daily check-in (mood, energy, miss-you meter)
- Daily romantic prompt/question
- Gentle streaks that reward consistency without punishment anxiety

### 4) Love Story Timeline
A chapter-based timeline instead of generic feed.

Examples:
- how we met
- first trip
- first big challenge we overcame
- anniversaries

Timeline progress unlocks:
- room themes
- badges
- highlighted memory collections

### 5) Couple Play + Shared Time
- mini-games (co-op or light challenge)
- quiz formats (know me better, love language, memory quiz)
- watch-together with reactions and post-watch prompts

Baseline delivered in core roadmap:
- one co-op prompt game lane
- one watch-together lane with private shared reactions

## Core Loops
1. Communicate -> Earn Love Points -> Room evolves
2. Check in daily -> Keep emotional visibility high
3. Capture memories -> Build timeline chapters -> Unlock meaning
4. Play/watch together -> Shared moments -> Retention

## Retention Drivers
- shared room progression
- anniversary countdown and milestone resurfacing
- daily rituals and emotional visibility
- memory resurfacing (“on this day”)
- pair exclusivity and emotional ownership

## Product Boundaries (Non-Negotiable)
- Exactly two members per private world
- No couple discovery
- No public comments/likes/following
- No cross-couple interaction
- No manipulative dark patterns
- No therapy positioning

## Safety and Privacy Principles
- pair-only data access at DB policy level
- explicit consent for sensitive media interactions
- clear deletion/export controls
- secure auth/session defaults
- minimal data collection

## UX Quality Bar
The product must feel premium and emotionally polished:
- beautiful visual language
- smooth, subtle animations
- aww-worthy onboarding moments
- zero-clutter navigation

If emotional polish drops, product value drops.

## Monetization (Careful Freemium)
Free:
- core chat
- basic room
- limited storage
- core rituals and a few games

Premium:
- advanced room customization
- seasonal themes
- higher storage + backup
- premium badges + collectibles
- enhanced media/call quality
- AI anniversary recap artifacts

## Success Metrics
- Pair activation rate (signup -> paired world)
- Day-7 and Day-30 paired retention
- Daily ritual completion rate
- Weekly shared actions per pair
- Memory capture frequency
- Timeline chapter completion rate
- Premium conversion from engaged pairs

## V1 Build Priority
1. Private-world architecture (hard 2-partner boundary)
2. Shared room home experience
3. Communication core (chat/voice/call/video)
4. Daily rituals
5. Memory timeline + unlocks
6. Mini-games + watch-together baseline

## Delivery Stack Baseline
- Supabase remains source of truth for auth, pair lifecycle, data, policies, and storage access controls.
- 100ms is the baseline provider for real 1:1 voice/video media transport.
- OneSignal is the baseline provider for pair-scoped push notifications.
- Resend is the baseline provider for transactional app email.
- Redis is deferred to phase-2 and introduced only when async throughput/rate-limit requirements exceed Postgres/worker-only capacity.
- Environment strategy uses strict separation between public client variables and server-only secrets.

## Positioning
OurSpace is a private romantic world for couples who want more than texting: a place where love grows, memories live, and distance feels smaller.