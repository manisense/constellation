# Constellation Implementation Checklist

This checklist is the execution baseline for production delivery of the pair-only app.

## Phase 1 — Production Foundations (must-have)

- [ ] Environment standardization across local, EAS development, EAS preview, EAS production
- [ ] Remove all hardcoded credentials from source and committed config
- [ ] Supabase RLS + RPC verification for pair-only access boundaries
- [ ] Private media buckets + signed URL reads/writes
- [ ] Canonical chat service path (remove duplicated messaging flows)
- [ ] Error tracking and crash reporting integration
- [ ] CI checks for typecheck + migration safety + build smoke tests

## Phase 2 — Core Communication Completion (must-have)

- [ ] 100ms token-issuance backend endpoint
- [ ] Voice call flow wired to real RTC session join/leave
- [ ] Video call flow wired to real RTC session join/leave
- [ ] Call state sync persisted to `call_sessions` for audit/lifecycle
- [ ] OneSignal device registration and pair-scoped targeting
- [ ] Push events for incoming call, new message, partner joined
- [ ] Resend transactional templates (invite, confirmation, account request)

## Phase 3 — Media and Memory Hardening (must-have)

- [ ] Video upload support in chat and memories
- [ ] Upload validation (size/type), retries, and failure states
- [ ] Media metadata model for thumbnails/duration
- [ ] Background processing for media post-processing and cleanup
- [ ] Retention and deletion workflow for account data requests

## Phase 4 — Scale Controls (future must-have)

- [ ] Queue-backed worker infrastructure for retries and async fanout
- [ ] Idempotency keys for message/call/push/email jobs
- [ ] Redis adoption when queue latency or throughput thresholds are breached
- [ ] Rate limiting on token issuance and webhook endpoints
- [ ] Cost dashboard for RTC minutes, storage egress, push/email volume

## Phase 5 — Reliability + Operations (future must-have)

- [ ] SLOs for auth, pair lifecycle transitions, message delivery, call setup
- [ ] Alert routing and on-call runbooks
- [ ] Staged rollout + rollback playbook for iOS/Android releases
- [ ] Data export/deletion DSAR audit completion tracking

## Environment Variables

### Client (`EXPO_PUBLIC_*`)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ONESIGNAL_APP_ID`
- `EXPO_PUBLIC_API_BASE_URL`

### Server-only

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `HMS_ACCESS_KEY`
- `HMS_SECRET`
- `ONESIGNAL_REST_API_KEY`
- `REDIS_URL` (only if phase-2 enabled)