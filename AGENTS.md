# AGENTS.md — Implementation Guardrails

This file defines mandatory rules for all coding/design/content agents working in this repository.

## 1) Product Identity (Must Never Drift)
- This is a **private two-partner app**.
- Every core flow must assume **exactly 2 users per world**.
- No public social mechanics.

Forbidden additions:
- global/public feed
- public profiles
- follower graph
- cross-couple chat/discovery
- community comments/reactions across couples

## 2) UX Direction
- Primary entry should feel like a **shared romantic home**.
- UI tone: warm, cute, premium, emotionally safe.
- Keep screens minimal and intentional; avoid clutter.
- Prefer simple flows over feature sprawl.

## 3) Feature Priority Rule
When choosing what to build next, prioritize in this order:
1. Pair-only architecture + safety
2. Shared room/home experience
3. Communication quality (chat/call/video)
4. Daily rituals (check-ins/prompts)
5. Memory timeline progression
6. Couple games/watch-together

## 4) Data & Security Rules
- Enforce pair-only access with backend policies (RLS/RPC boundaries).
- Handle optional partner/membership states safely (`maybeSingle` where applicable).
- Never expose partner data outside constellation scope.
- Never commit secrets/keys/credentials in repo.

## 5) Agent Coding Rules
- Fix root cause, not only symptoms.
- Preserve existing navigation architecture unless required.
- Avoid adding new dependencies unless truly needed.
- Keep changes focused and minimal.
- Add docs updates when behavior changes.

## 6) Solo Test Mode Rule
- Solo mode is a **development convenience only**.
- It must not alter production pair-only product identity.
- Any solo logic must be clearly isolated and reversible.

## 7) Copy & Tone Rules
All user-facing copy should be:
- intimate but not cheesy
- supportive, not judgmental
- clear, short, and emotionally warm

Avoid:
- manipulative urgency
- guilt-based streak language
- therapy or medical claims

## 8) Decision Filter (Use Before Merging)
Any new feature/change must answer YES to all:
- Does this strengthen connection between two partners?
- Does this keep privacy and exclusivity intact?
- Does this keep UI emotionally polished and simple?
- Does this avoid turning the app into social media?

If any answer is NO, do not merge.