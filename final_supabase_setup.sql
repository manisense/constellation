-- Constellation: Final Supabase Bootstrap (from scratch)
-- Run this once in Supabase SQL Editor on a fresh project.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =====================================================
-- Cleanup (idempotent)
-- =====================================================
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.sync_profile_compat_fields() cascade;
drop function if exists public.enforce_constellation_member_limit() cascade;
drop function if exists public.generate_invite_code() cascade;
drop function if exists public.assign_invite_code() cascade;
drop function if exists public.create_user_profile(uuid, text, text) cascade;
drop function if exists public.update_profile(text, text, text[], text, text, text) cascade;
drop function if exists public.get_profile() cascade;
drop function if exists public.get_user_constellation_status() cascade;
drop function if exists public.create_new_constellation(text) cascade;
drop function if exists public.join_constellation(text) cascade;
drop function if exists public.join_constellation_with_code(text) cascade;
drop function if exists public.get_constellation_messages(uuid) cascade;
drop function if exists public.send_message(uuid, text, text) cascade;
drop function if exists public.get_partner_profile(uuid) cascade;
drop function if exists public.increase_bonding_strength(uuid, integer) cascade;
drop function if exists public.get_bonding_strength(uuid) cascade;
drop function if exists public.should_show_home_screen() cascade;
drop function if exists public.user_has_constellation_membership(uuid) cascade;
drop function if exists public.user_is_in_any_constellation() cascade;
drop function if exists public.constellation_member_count(uuid) cascade;

drop table if exists public.quiz_results cascade;
drop table if exists public.quiz_progress cascade;
drop table if exists public.messages cascade;
drop table if exists public.date_plans cascade;
drop table if exists public.memories cascade;
drop table if exists public.constellation_members cascade;
drop table if exists public.constellations cascade;
drop table if exists public.profiles cascade;

-- =====================================================
-- Core tables
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'User',
  about text not null default '',
  interests text[] not null default '{}',
  star_name text,
  star_type text check (star_type in ('luminary','navigator') or star_type is null),
  photo_url text,
  avatar_url text,
  "starName" text,
  "starType" text,
  quiz_completed boolean not null default false,
  "quizCompleted" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.constellations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Constellation',
  invite_code text unique not null,
  bonding_strength integer not null default 0 check (bonding_strength between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.constellation_members (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'joined' check (status in ('joined','quiz_completed','ready','active')),
  star_type text check (star_type in ('luminary','navigator') or star_type is null),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (constellation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, constellation_id)
);

-- id is text for app compatibility (QuizScreen uses custom string id)
create table public.quiz_results (
  id text primary key,
  quiz_id text not null default 'personality_quiz',
  user_id uuid not null references public.profiles(id) on delete cascade,
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  result text check (result in ('luminary','navigator') or result is null),
  created_at timestamptz not null default now()
);

create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date text not null,
  location text,
  status text not null default 'pending' check (status in ('pending','accepted','completed','cancelled','planned')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date text not null,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_constellation_members_user on public.constellation_members(user_id);
create index idx_constellation_members_constellation on public.constellation_members(constellation_id);
create index idx_messages_constellation_created on public.messages(constellation_id, created_at desc);
create index idx_quiz_progress_user_constellation on public.quiz_progress(user_id, constellation_id);
create index idx_date_plans_constellation on public.date_plans(constellation_id);
create index idx_memories_constellation on public.memories(constellation_id);

-- =====================================================
-- Triggers and helper functions
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_profile_compat_fields()
returns trigger
language plpgsql
as $$
begin
  if new.star_type is null and new."starType" is not null then
    new.star_type = lower(new."starType");
  end if;
  if new."starType" is null and new.star_type is not null then
    new."starType" = new.star_type;
  end if;

  if new.star_name is null and new."starName" is not null then
    new.star_name = new."starName";
  end if;
  if new."starName" is null and new.star_name is not null then
    new."starName" = new.star_name;
  end if;

  if new.quiz_completed is null and new."quizCompleted" is not null then
    new.quiz_completed = new."quizCompleted";
  end if;
  if new."quizCompleted" is null and new.quiz_completed is not null then
    new."quizCompleted" = new.quiz_completed;
  end if;

  return new;
end;
$$;

create trigger trg_profiles_sync_compat
before insert or update on public.profiles
for each row execute function public.sync_profile_compat_fields();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_constellations_updated_at
before update on public.constellations
for each row execute function public.set_updated_at();

create trigger trg_constellation_members_updated_at
before update on public.constellation_members
for each row execute function public.set_updated_at();

create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger trg_date_plans_updated_at
before update on public.date_plans
for each row execute function public.set_updated_at();

create trigger trg_memories_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create or replace function public.enforce_constellation_member_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.constellation_members where constellation_id = new.constellation_id) >= 2 then
    raise exception 'Constellation can only have 2 members';
  end if;
  return new;
end;
$$;

create trigger trg_constellation_member_limit
before insert on public.constellation_members
for each row execute function public.enforce_constellation_member_limit();

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.assign_invite_code()
returns trigger
language plpgsql
as $$
declare
  candidate text;
begin
  if new.invite_code is not null and length(trim(new.invite_code)) > 0 then
    return new;
  end if;

  loop
    candidate := public.generate_invite_code();
    exit when not exists (select 1 from public.constellations c where c.invite_code = candidate);
  end loop;

  new.invite_code := candidate;
  return new;
end;
$$;

create trigger trg_assign_invite_code
before insert on public.constellations
for each row execute function public.assign_invite_code();

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, about, interests, photo_url, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    '',
    '{}'::text[],
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- RLS helper functions (avoid policy recursion)
-- =====================================================
create or replace function public.user_has_constellation_membership(target_constellation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.constellation_members cm
    where cm.constellation_id = target_constellation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.user_is_in_any_constellation()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.constellation_members cm
    where cm.user_id = auth.uid()
  );
$$;

create or replace function public.constellation_member_count(target_constellation_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.constellation_members cm
  where cm.constellation_id = target_constellation_id;
$$;

-- =====================================================
-- RLS
-- =====================================================
alter table public.profiles enable row level security;
alter table public.constellations enable row level security;
alter table public.constellation_members enable row level security;
alter table public.messages enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_progress enable row level security;
alter table public.date_plans enable row level security;
alter table public.memories enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_select_partner on public.profiles;
create policy profiles_select_partner on public.profiles
for select using (
  exists (
    select 1
    from public.constellation_members me
    join public.constellation_members them
      on me.constellation_id = them.constellation_id
    where me.user_id = auth.uid()
      and them.user_id = profiles.id
  )
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- constellations
drop policy if exists constellations_select_member on public.constellations;
create policy constellations_select_member on public.constellations
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = constellations.id and cm.user_id = auth.uid()
  )
);

drop policy if exists constellations_insert_creator on public.constellations;
create policy constellations_insert_creator on public.constellations
for insert with check (auth.uid() = created_by);

drop policy if exists constellations_update_member on public.constellations;
create policy constellations_update_member on public.constellations
for update using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = constellations.id and cm.user_id = auth.uid()
  )
);

-- constellation_members
drop policy if exists constellation_members_select_member on public.constellation_members;
create policy constellation_members_select_member on public.constellation_members
for select using (public.user_has_constellation_membership(constellation_id));

drop policy if exists constellation_members_insert_self on public.constellation_members;
create policy constellation_members_insert_self on public.constellation_members
for insert with check (
  user_id = auth.uid()
  and not public.user_is_in_any_constellation()
  and public.constellation_member_count(constellation_id) < 2
);

drop policy if exists constellation_members_update_self on public.constellation_members;
create policy constellation_members_update_self on public.constellation_members
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages
drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = messages.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists messages_insert_sender_member on public.messages;
create policy messages_insert_sender_member on public.messages
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = messages.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages
for delete using (user_id = auth.uid());

-- quiz_results
drop policy if exists quiz_results_select_member on public.quiz_results;
create policy quiz_results_select_member on public.quiz_results
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = quiz_results.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists quiz_results_insert_own on public.quiz_results;
create policy quiz_results_insert_own on public.quiz_results
for insert with check (user_id = auth.uid());

-- quiz_progress
drop policy if exists quiz_progress_select_member on public.quiz_progress;
create policy quiz_progress_select_member on public.quiz_progress
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = quiz_progress.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists quiz_progress_insert_own on public.quiz_progress;
create policy quiz_progress_insert_own on public.quiz_progress
for insert with check (user_id = auth.uid());

drop policy if exists quiz_progress_update_own on public.quiz_progress;
create policy quiz_progress_update_own on public.quiz_progress
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- date_plans
drop policy if exists date_plans_select_member on public.date_plans;
create policy date_plans_select_member on public.date_plans
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = date_plans.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists date_plans_insert_member on public.date_plans;
create policy date_plans_insert_member on public.date_plans
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = date_plans.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists date_plans_update_member on public.date_plans;
create policy date_plans_update_member on public.date_plans
for update using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = date_plans.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists date_plans_delete_creator on public.date_plans;
create policy date_plans_delete_creator on public.date_plans
for delete using (created_by = auth.uid());

-- memories
drop policy if exists memories_select_member on public.memories;
create policy memories_select_member on public.memories
for select using (
  exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = memories.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists memories_insert_member on public.memories;
create policy memories_insert_member on public.memories
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = memories.constellation_id and cm.user_id = auth.uid()
  )
);

drop policy if exists memories_update_creator on public.memories;
create policy memories_update_creator on public.memories
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists memories_delete_creator on public.memories;
create policy memories_delete_creator on public.memories
for delete using (created_by = auth.uid());

-- =====================================================
-- RPC functions expected by app
-- =====================================================
create or replace function public.create_user_profile(user_id uuid, user_name text, user_photo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, about, interests, photo_url, avatar_url)
  values (user_id, coalesce(user_name, 'User'), '', '{}'::text[], coalesce(user_photo, ''), coalesce(user_photo, ''))
  on conflict (id) do update set
    name = excluded.name,
    photo_url = coalesce(excluded.photo_url, public.profiles.photo_url),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.update_profile(
  name text default null,
  about text default null,
  interests text[] default null,
  star_name text default null,
  star_type text default null,
  avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'No authenticated user');
  end if;

  update public.profiles p
  set
    name = coalesce(update_profile.name, p.name),
    about = coalesce(update_profile.about, p.about),
    interests = coalesce(update_profile.interests, p.interests),
    star_name = coalesce(update_profile.star_name, p.star_name),
    star_type = coalesce(lower(update_profile.star_type), p.star_type),
    avatar_url = coalesce(update_profile.avatar_url, p.avatar_url),
    photo_url = coalesce(update_profile.avatar_url, p.photo_url),
    updated_at = now()
  where p.id = uid;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.get_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'No authenticated user');
  end if;

  select * into prof from public.profiles where id = uid;

  if prof.id is null then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  return jsonb_build_object('success', true, 'profile', to_jsonb(prof));
end;
$$;

create or replace function public.create_new_constellation(constellation_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_constellation public.constellations;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'message', 'No authenticated user');
  end if;

  if exists (select 1 from public.constellation_members where user_id = uid) then
    return jsonb_build_object('success', false, 'message', 'User already in a constellation');
  end if;

  insert into public.constellations(name, created_by)
  values (coalesce(nullif(trim(constellation_name), ''), 'Our Constellation'), uid)
  returning * into new_constellation;

  insert into public.constellation_members(constellation_id, user_id, status, star_type)
  values (new_constellation.id, uid, 'ready', 'luminary');

  update public.profiles
  set star_type = coalesce(star_type, 'luminary'),
      "starType" = coalesce("starType", 'luminary'),
      updated_at = now()
  where id = uid;

  return jsonb_build_object(
    'success', true,
    'constellation_id', new_constellation.id,
    'invite_code', new_constellation.invite_code,
    'name', new_constellation.name
  );
end;
$$;

create or replace function public.join_constellation(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.constellations;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'message', 'No authenticated user');
  end if;

  if exists (select 1 from public.constellation_members where user_id = uid) then
    return jsonb_build_object('success', false, 'message', 'User already in a constellation');
  end if;

  select * into target from public.constellations where constellations.invite_code = upper(trim(join_constellation.invite_code));
  if target.id is null then
    return jsonb_build_object('success', false, 'message', 'Invalid invite code');
  end if;

  if (select count(*) from public.constellation_members where constellation_id = target.id) >= 2 then
    return jsonb_build_object('success', false, 'message', 'Constellation already full');
  end if;

  insert into public.constellation_members(constellation_id, user_id, status, star_type)
  values (target.id, uid, 'ready', 'navigator');

  update public.profiles
  set star_type = coalesce(star_type, 'navigator'),
      "starType" = coalesce("starType", 'navigator'),
      updated_at = now()
  where id = uid;

  return jsonb_build_object('success', true, 'constellation_id', target.id);
end;
$$;

create or replace function public.join_constellation_with_code(invite_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.join_constellation(invite_code);
$$;

create or replace function public.get_user_constellation_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  constellation_row public.constellations;
  member_count int;
  my_star text;
  partner_star text;
begin
  if uid is null then
    return jsonb_build_object('status', 'no_user', 'message', 'No authenticated user');
  end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  select constellation_id into cid
  from public.constellation_members
  where user_id = uid
  limit 1;

  if cid is null then
    return jsonb_build_object('status', 'no_constellation');
  end if;

  select * into constellation_row from public.constellations where id = cid;
  select count(*) into member_count from public.constellation_members where constellation_id = cid;

  if member_count < 2 then
    return jsonb_build_object(
      'status', 'waiting_for_partner',
      'constellation', jsonb_build_object(
        'constellation_id', constellation_row.id,
        'constellation_name', constellation_row.name,
        'invite_code', constellation_row.invite_code
      )
    );
  end if;

  select coalesce(p.star_type, p."starType") into my_star from public.profiles p where p.id = uid;

  select coalesce(p.star_type, p."starType") into partner_star
  from public.constellation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.constellation_id = cid and cm.user_id <> uid
  limit 1;

  if my_star is not null and partner_star is not null then
    return jsonb_build_object('status', 'complete');
  end if;

  return jsonb_build_object('status', 'quiz_needed');
end;
$$;

create or replace function public.get_constellation_messages(constellation_id uuid)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = get_constellation_messages.constellation_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'User is not a member of this constellation';
  end if;

  return query
  select m.*
  from public.messages m
  where m.constellation_id = get_constellation_messages.constellation_id
  order by m.created_at desc
  limit 200;
end;
$$;

create or replace function public.send_message(
  constellation_id uuid,
  content text,
  image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'No authenticated user');
  end if;

  if not exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = send_message.constellation_id
      and cm.user_id = uid
  ) then
    return jsonb_build_object('success', false, 'error', 'Not a constellation member');
  end if;

  insert into public.messages(constellation_id, user_id, content, image_url)
  values (send_message.constellation_id, uid, coalesce(send_message.content, ''), send_message.image_url)
  returning id into new_id;

  perform public.increase_bonding_strength(send_message.constellation_id, 1);

  return jsonb_build_object('success', true, 'message_id', new_id);
end;
$$;

create or replace function public.get_partner_profile(constellation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  partner record;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'No authenticated user');
  end if;

  if not exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = get_partner_profile.constellation_id
      and cm.user_id = uid
  ) then
    return jsonb_build_object('success', false, 'error', 'Not a constellation member');
  end if;

  select
    p.id,
    p.name,
    coalesce(p.avatar_url, p.photo_url) as avatar_url,
    p.star_name,
    coalesce(cm.star_type, p.star_type, p."starType") as star_type,
    p.about as bio
  into partner
  from public.constellation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.constellation_id = get_partner_profile.constellation_id
    and cm.user_id <> uid
  limit 1;

  if partner is null then
    return jsonb_build_object('success', false, 'error', 'Partner not found');
  end if;

  return jsonb_build_object('success', true, 'partner', to_jsonb(partner));
end;
$$;

create or replace function public.increase_bonding_strength(
  constellation_id uuid,
  amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_strength int;
begin
  update public.constellations c
  set bonding_strength = least(100, greatest(0, coalesce(c.bonding_strength, 0) + coalesce(increase_bonding_strength.amount, 1))),
      updated_at = now()
  where c.id = increase_bonding_strength.constellation_id
  returning bonding_strength into updated_strength;

  return jsonb_build_object('success', true, 'bonding_strength', coalesce(updated_strength, 0));
end;
$$;

create or replace function public.get_bonding_strength(constellation_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('bonding_strength', coalesce(c.bonding_strength, 0))
  from public.constellations c
  where c.id = get_bonding_strength.constellation_id;
$$;

create or replace function public.should_show_home_screen()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  done_count int;
begin
  if uid is null then
    return false;
  end if;

  select constellation_id into cid from public.constellation_members where user_id = uid limit 1;
  if cid is null then
    return false;
  end if;

  select count(*) into done_count
  from public.constellation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.constellation_id = cid
    and coalesce(p.star_type, p."starType") is not null;

  return done_count = 2;
end;
$$;

-- =====================================================
-- Realtime publication
-- =====================================================
drop publication if exists supabase_realtime;
create publication supabase_realtime for table
  public.messages,
  public.quiz_progress,
  public.constellation_members,
  public.constellations;

-- =====================================================
-- Storage buckets and policies
-- =====================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = excluded.public;

-- avatars policies
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
for select to public
using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- memories policies
drop policy if exists memories_read_member on storage.objects;
create policy memories_read_member on storage.objects
for select to authenticated
using (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

drop policy if exists memories_insert_member on storage.objects;
create policy memories_insert_member on storage.objects
for insert to authenticated
with check (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

-- chat-images policies
drop policy if exists chat_images_read_member on storage.objects;
create policy chat_images_read_member on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

drop policy if exists chat_images_insert_member on storage.objects;
create policy chat_images_insert_member on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

-- Optional grants (Supabase usually sets these; kept explicit for clarity)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- =====================================================
-- Core rollout extensions (pair-only)
-- =====================================================

create table if not exists public.room_states (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null unique references public.constellations(id) on delete cascade,
  ambience text not null default 'starglow' check (ambience in ('starglow','sunset','moonlight')),
  decor_level integer not null default 1,
  unlocked_artifacts text[] not null default '{}',
  chapter_unlocked integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  started_by uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','active','ended','missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_ritual_entries (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete cascade,
  ritual_type text not null check (ritual_type in ('check_in','prompt','gratitude')),
  prompt_text text,
  response_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.timeline_chapters (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  chapter_index integer not null,
  title text not null,
  summary text not null default '',
  is_unlocked boolean not null default false,
  milestone_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (constellation_id, chapter_index)
);

create table if not exists public.couple_sessions (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  mode text not null check (mode in ('game','watch')),
  status text not null default 'active' check (status in ('active','ended')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export','deletion')),
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists message_type text not null default 'text' check (message_type in ('text','image','voice_note'));

alter table public.messages
  add column if not exists voice_note_url text;

alter table public.messages
  add column if not exists voice_note_duration_ms integer;

create or replace function public.is_pair_member(target_constellation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.constellation_members cm
    where cm.constellation_id = target_constellation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.request_account_export()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.account_data_requests (user_id, request_type)
  values (auth.uid(), 'export');

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.account_data_requests (user_id, request_type)
  values (auth.uid(), 'deletion');

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.get_constellation_ritual_streak(target_constellation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  streak_count integer := 0;
begin
  if not public.is_pair_member(target_constellation_id) then
    return 0;
  end if;

  select count(*)::int
  into streak_count
  from (
    select date_trunc('day', created_at) as ritual_day
    from public.daily_ritual_entries
    where constellation_id = target_constellation_id
    group by date_trunc('day', created_at)
  ) days
  where ritual_day >= date_trunc('day', now()) - interval '14 days';

  return coalesce(streak_count, 0);
end;
$$;

create or replace function public.get_on_this_day_memories(
  target_constellation_id uuid,
  target_month integer,
  target_day integer
)
returns setof public.memories
language sql
stable
as $$
  select *
  from public.memories
  where constellation_id = target_constellation_id
    and extract(month from date::date) = target_month
    and extract(day from date::date) = target_day
  order by date desc;
$$;

alter table public.room_states enable row level security;
alter table public.call_sessions enable row level security;
alter table public.daily_ritual_entries enable row level security;
alter table public.timeline_chapters enable row level security;
alter table public.couple_sessions enable row level security;
alter table public.account_data_requests enable row level security;

drop policy if exists room_states_pair_access on public.room_states;
create policy room_states_pair_access on public.room_states
for all to authenticated
using (public.is_pair_member(constellation_id))
with check (public.is_pair_member(constellation_id));

drop policy if exists call_sessions_pair_access on public.call_sessions;
create policy call_sessions_pair_access on public.call_sessions
for all to authenticated
using (public.is_pair_member(constellation_id))
with check (public.is_pair_member(constellation_id));

drop policy if exists rituals_pair_access on public.daily_ritual_entries;
create policy rituals_pair_access on public.daily_ritual_entries
for all to authenticated
using (public.is_pair_member(constellation_id))
with check (public.is_pair_member(constellation_id));

drop policy if exists timeline_pair_access on public.timeline_chapters;
create policy timeline_pair_access on public.timeline_chapters
for all to authenticated
using (public.is_pair_member(constellation_id))
with check (public.is_pair_member(constellation_id));

drop policy if exists couple_sessions_pair_access on public.couple_sessions;
create policy couple_sessions_pair_access on public.couple_sessions
for all to authenticated
using (public.is_pair_member(constellation_id))
with check (public.is_pair_member(constellation_id));

drop policy if exists account_requests_owner_access on public.account_data_requests;
create policy account_requests_owner_access on public.account_data_requests
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists voice_notes_read_member on storage.objects;
create policy voice_notes_read_member on storage.objects
for select to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

drop policy if exists voice_notes_insert_member on storage.objects;
create policy voice_notes_insert_member on storage.objects
for insert to authenticated
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] in (
    select cm.constellation_id::text from public.constellation_members cm where cm.user_id = auth.uid()
  )
);

-- =====================================================
-- Notifications foundation (pair-only)
-- =====================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('onesignal')),
  subscription_id text not null,
  platform text not null check (platform in ('ios','android')),
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, subscription_id)
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('message_new','call_ringing','ritual_reminder','partner_joined','system')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','discarded')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_devices_user_active
  on public.push_devices(user_id, is_active);

create index if not exists idx_notification_outbox_delivery
  on public.notification_outbox(status, available_at, recipient_user_id);

alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notification_outbox enable row level security;

drop policy if exists notification_preferences_owner_access on public.notification_preferences;
create policy notification_preferences_owner_access on public.notification_preferences
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_devices_owner_access on public.push_devices;
create policy push_devices_owner_access on public.push_devices
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_outbox_pair_select on public.notification_outbox;
create policy notification_outbox_pair_select on public.notification_outbox
for select to authenticated
using (recipient_user_id = auth.uid());

create or replace function public.get_notification_preferences()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pref_row public.notification_preferences;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into pref_row
  from public.notification_preferences
  where user_id = auth.uid();

  if pref_row.user_id is null then
    return jsonb_build_object(
      'push_enabled', true,
      'email_enabled', true
    );
  end if;

  return jsonb_build_object(
    'push_enabled', pref_row.push_enabled,
    'email_enabled', pref_row.email_enabled,
    'updated_at', pref_row.updated_at
  );
end;
$$;

create or replace function public.set_notification_preferences(
  p_push_enabled boolean default null,
  p_email_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.notification_preferences;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.notification_preferences (user_id, push_enabled, email_enabled, updated_at)
  values (
    auth.uid(),
    coalesce(p_push_enabled, true),
    coalesce(p_email_enabled, true),
    now()
  )
  on conflict (user_id) do update
  set
    push_enabled = coalesce(p_push_enabled, public.notification_preferences.push_enabled),
    email_enabled = coalesce(p_email_enabled, public.notification_preferences.email_enabled),
    updated_at = now()
  returning * into result_row;

  return jsonb_build_object(
    'push_enabled', result_row.push_enabled,
    'email_enabled', result_row.email_enabled,
    'updated_at', result_row.updated_at
  );
end;
$$;

create or replace function public.register_push_device(
  p_provider text,
  p_subscription_id text,
  p_platform text,
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  device_row public.push_devices;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_subscription_id is null or length(trim(p_subscription_id)) = 0 then
    raise exception 'subscription_id is required';
  end if;

  insert into public.push_devices (
    user_id,
    provider,
    subscription_id,
    platform,
    app_version,
    is_active,
    last_seen_at,
    updated_at
  )
  values (
    auth.uid(),
    p_provider,
    p_subscription_id,
    p_platform,
    p_app_version,
    true,
    now(),
    now()
  )
  on conflict (provider, subscription_id) do update
  set
    user_id = auth.uid(),
    platform = excluded.platform,
    app_version = excluded.app_version,
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  returning * into device_row;

  return jsonb_build_object(
    'id', device_row.id,
    'provider', device_row.provider,
    'platform', device_row.platform,
    'is_active', device_row.is_active,
    'last_seen_at', device_row.last_seen_at
  );
end;
$$;

create or replace function public.unregister_push_device(
  p_provider text,
  p_subscription_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.push_devices
  set
    is_active = false,
    updated_at = now()
  where user_id = auth.uid()
    and provider = p_provider
    and subscription_id = p_subscription_id;

  get diagnostics affected_rows = row_count;

  return jsonb_build_object(
    'success', true,
    'updated', affected_rows
  );
end;
$$;

create or replace function public.enqueue_pair_notification(
  target_constellation_id uuid,
  target_event_type text,
  target_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_user_id uuid;
  outbox_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_pair_member(target_constellation_id) then
    raise exception 'Access denied';
  end if;

  select cm.user_id
  into partner_user_id
  from public.constellation_members cm
  where cm.constellation_id = target_constellation_id
    and cm.user_id <> auth.uid()
  limit 1;

  if partner_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'partner_not_found');
  end if;

  insert into public.notification_outbox (
    constellation_id,
    recipient_user_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    target_constellation_id,
    partner_user_id,
    auth.uid(),
    target_event_type,
    coalesce(target_payload, '{}'::jsonb)
  )
  returning id into outbox_id;

  return jsonb_build_object('success', true, 'outbox_id', outbox_id);
end;
$$;
