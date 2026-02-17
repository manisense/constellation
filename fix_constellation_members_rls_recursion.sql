-- Fix recursive RLS policy on constellation_members
-- Run this in Supabase SQL editor for existing deployed DBs.

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
