-- Notification Dispatcher Scheduler Setup
--
-- Run this in Supabase SQL editor AFTER:
-- 1) Deploying edge function: notification-dispatcher
-- 2) Applying final_supabase_setup.sql
--
-- IMPORTANT:
-- - Replace <PROJECT_REF> with your Supabase project ref
-- - Replace <SERVICE_ROLE_JWT> with your service role key
-- - Do NOT commit real secret values into this file

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old schedule if it already exists
select cron.unschedule('notification_dispatcher_every_minute')
where exists (
  select 1
  from cron.job
  where jobname = 'notification_dispatcher_every_minute'
);

-- Schedule dispatcher every minute
select cron.schedule(
  'notification_dispatcher_every_minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/notification-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_JWT>'
    ),
    body := '{"batch_size":20}'::jsonb
  );
  $$
);

-- Optional: verify the job exists
select jobid, jobname, schedule, active
from cron.job
where jobname = 'notification_dispatcher_every_minute';
