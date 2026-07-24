-- JP Innovation Hub profile photo approvals
-- Run once in Supabase SQL editor.
-- This creates a reliable RPC workflow so profile photos do not depend on
-- fragile direct table updates from the browser.

alter table public.profiles
  add column if not exists profile_photo_url text not null default '',
  add column if not exists profile_photo_pending_url text not null default '',
  add column if not exists profile_photo_status text not null default 'none',
  add column if not exists profile_photo_submitted_at timestamptz,
  add column if not exists profile_photo_reviewed_at timestamptz;

create or replace function public.is_hub_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and account_type = 'admin'
      and coalesce(status, 'active') <> 'removed'
  );
$$;

create or replace function public.submit_profile_photo_for_approval(p_photo_data text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_photo_data is null or length(trim(p_photo_data)) < 20 then
    raise exception 'Missing profile photo';
  end if;

  if length(p_photo_data) > 3500000 then
    raise exception 'Profile photo is too large';
  end if;

  update public.profiles
  set
    profile_photo_pending_url = p_photo_data,
    profile_photo_status = 'pending',
    profile_photo_submitted_at = now(),
    profile_photo_reviewed_at = null
  where user_id = auth.uid()
    and coalesce(status, 'active') <> 'removed'
  returning * into updated_profile;

  if not found then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.admin_list_profile_photo_approvals()
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_hub_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select *
  from public.profiles
  where coalesce(profile_photo_pending_url, '') <> ''
    and profile_photo_status = 'pending'
    and coalesce(status, 'active') <> 'removed'
  order by profile_photo_submitted_at asc nulls last, full_name asc;
end;
$$;

create or replace function public.admin_moderate_profile_photo(
  p_target_user uuid,
  p_action text,
  p_reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_profile public.profiles%rowtype;
  action_clean text := lower(trim(coalesce(p_action, '')));
begin
  if not public.is_hub_admin() then
    raise exception 'Admin access required';
  end if;

  if action_clean not in ('approve', 'reject') then
    raise exception 'Invalid photo moderation action';
  end if;

  select * into reviewed_profile
  from public.profiles
  where user_id = p_target_user
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(reviewed_profile.profile_photo_pending_url, '') = ''
     or reviewed_profile.profile_photo_status <> 'pending' then
    raise exception 'No pending photo for this profile';
  end if;

  if action_clean = 'approve' then
    update public.profiles
    set
      profile_photo_url = reviewed_profile.profile_photo_pending_url,
      profile_photo_pending_url = '',
      profile_photo_status = 'approved',
      profile_photo_reviewed_at = now()
    where user_id = p_target_user
    returning * into reviewed_profile;
  else
    update public.profiles
    set
      profile_photo_pending_url = '',
      profile_photo_status = case when coalesce(profile_photo_url, '') <> '' then 'approved' else 'rejected' end,
      profile_photo_reviewed_at = now()
    where user_id = p_target_user
    returning * into reviewed_profile;
  end if;

  return reviewed_profile;
end;
$$;

grant execute on function public.submit_profile_photo_for_approval(text) to authenticated;
grant execute on function public.admin_list_profile_photo_approvals() to authenticated;
grant execute on function public.admin_moderate_profile_photo(uuid, text, text) to authenticated;
