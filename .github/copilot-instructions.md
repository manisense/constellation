# Copilot Instructions — OurSpace

Follow this guidance for all code generation and edits in this repo.

## Product Constraints
- Build for one private couple only (2 users max in one shared world).
- Do not create social/public/discovery features.
- Treat the app as a romantic digital home, not a general messenger.

## Engineering Priorities
1. Reliability of auth + pair state transitions
2. Privacy and policy-safe data access
3. Shared room/home quality
4. Communication flows (chat/call/video)
5. Rituals, timeline, memories, play experiences

## Implementation Rules
- Prefer backend status/RPC source of truth for lifecycle decisions.
- Handle no-row membership as valid state when appropriate.
- Keep navigation stack-safe; avoid invalid resets across stacks.
- Keep solo test mode isolated from production semantics.
- Preserve existing design language and avoid unnecessary UI expansion.

## Non-Negotiables
- No public feed/profile/follower systems.
- No cross-couple interactions.
- No hardcoded secrets.
- No overengineering in MVP paths.

## Documentation Rule
Whenever introducing new behavior in a user flow, update:
- `README.md` (developer setup/flow impact)
- `project.md` (product vision/scope impact) if strategic.