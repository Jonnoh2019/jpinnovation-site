-- JP Innovation production core fixes
-- Run this after the existing JP Innovation Supabase setup scripts.
-- It makes Hub upgrade requests auditable and gives the frontend a safe admin RPC for access changes.

alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists status text default 'active';
alter table public.profiles add column if not exists vetted_at timestamptz;

create table if not exists public.hub_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  current_account text not null default 'client',
  requested_membership text not null default 'Innovation Hub',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_by_name text not null default '',
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hub_upgrade_requests_one_pending_per_user
on public.hub_upgrade_requests(user_id)
where status = 'pending';

alter table public.hub_upgrade_requests enable row level security;

drop policy if exists "users can read own hub upgrade requests" on public.hub_upgrade_requests;
create policy "users can read own hub upgrade requests"
on public.hub_upgrade_requests
for select to authenticated
using (user_id = auth.uid() or public.is_hub_admin());

drop policy if exists "users can create own hub upgrade requests" on public.hub_upgrade_requests;
create policy "users can create own hub upgrade requests"
on public.hub_upgrade_requests
for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "users can cancel own pending hub upgrade requests" on public.hub_upgrade_requests;
create policy "users can cancel own pending hub upgrade requests"
on public.hub_upgrade_requests
for update to authenticated
using ((user_id = auth.uid() and status = 'pending') or public.is_hub_admin())
with check ((user_id = auth.uid() and status in ('pending','cancelled')) or public.is_hub_admin());

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  detail text not null default '',
  target_view text not null default 'admin',
  target_id text not null default '',
  event_key text not null default '',
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists admin_notifications_status_created_idx
on public.admin_notifications(status, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "admin notification visibility" on public.admin_notifications;
create policy "admin notification visibility"
on public.admin_notifications
for select to authenticated
using (user_id = auth.uid() or public.is_hub_admin());

drop policy if exists "admin notification insert" on public.admin_notifications;
create policy "admin notification insert"
on public.admin_notifications
for insert to authenticated
with check (public.is_hub_admin() or user_id = auth.uid());

drop policy if exists "admin notification update" on public.admin_notifications;
create policy "admin notification update"
on public.admin_notifications
for update to authenticated
using (user_id = auth.uid() or public.is_hub_admin())
with check (user_id = auth.uid() or public.is_hub_admin());

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admins can read audit log" on public.admin_audit_log;
create policy "admins can read audit log"
on public.admin_audit_log
for select to authenticated
using (public.is_hub_admin());

drop policy if exists "admins can write audit log" on public.admin_audit_log;
create policy "admins can write audit log"
on public.admin_audit_log
for insert to authenticated
with check (public.is_hub_admin());

create or replace function public.request_hub_access(p_message text default '')
returns public.hub_upgrade_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  requester public.profiles%rowtype;
  existing public.hub_upgrade_requests%rowtype;
  created_request public.hub_upgrade_requests%rowtype;
  admin_record record;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to request Hub access';
  end if;

  select * into requester from public.profiles where user_id = auth.uid();
  if not found then
    raise exception 'Profile not found';
  end if;

  if requester.account_type in ('member','admin') and requester.membership_status = 'active' then
    raise exception 'This account already has Innovation Hub access';
  end if;

  select * into existing
  from public.hub_upgrade_requests
  where user_id = auth.uid() and status = 'pending'
  order by requested_at desc
  limit 1;

  if found then
    return existing;
  end if;

  insert into public.hub_upgrade_requests (
    user_id, name, email, current_account, requested_membership, message, status
  ) values (
    auth.uid(),
    coalesce(requester.full_name, requester.email, ''),
    coalesce(requester.email, ''),
    coalesce(requester.account_type, 'client'),
    'Innovation Hub',
    coalesce(p_message, ''),
    'pending'
  )
  returning * into created_request;

  update public.profiles
  set membership_status = 'pending',
      updated_at = now()
  where user_id = auth.uid()
    and coalesce(account_type, 'client') = 'client'
    and coalesce(membership_status, 'free') not in ('active','suspended');

  for admin_record in
    select user_id from public.profiles where account_type = 'admin'
  loop
    insert into public.admin_notifications (
      user_id, title, detail, target_view, target_id, event_key
    ) values (
      admin_record.user_id,
      'New Hub upgrade request',
      coalesce(requester.full_name, requester.email, 'A client') || ' requested Innovation Hub access.',
      'admin',
      created_request.id::text,
      'hub_upgrade_request:' || created_request.id::text || ':' || admin_record.user_id::text
    );
  end loop;

  return created_request;
end;
$$;

create or replace function public.admin_set_account_access(
  p_user_id uuid,
  p_account_type text default null,
  p_membership_status text default null,
  p_profile_status text default null,
  p_reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile public.profiles%rowtype;
  updated_profile public.profiles%rowtype;
  latest_request public.hub_upgrade_requests%rowtype;
  resolved_status text;
begin
  if auth.uid() is null or not public.is_hub_admin() then
    raise exception 'Admin access required';
  end if;

  select * into admin_profile from public.profiles where user_id = auth.uid();

  update public.profiles
  set account_type = coalesce(p_account_type, account_type),
      membership_status = coalesce(p_membership_status, membership_status),
      status = coalesce(p_profile_status, status, 'active'),
      vetted_at = case
        when coalesce(p_account_type, account_type) in ('member','admin')
          and coalesce(p_membership_status, membership_status) = 'active'
        then coalesce(vetted_at, now())
        when coalesce(p_account_type, account_type) = 'client'
          and coalesce(p_membership_status, membership_status) in ('free','rejected')
        then null
        else vetted_at
      end,
      updated_at = now()
  where user_id = p_user_id
  returning * into updated_profile;

  if not found then
    raise exception 'Profile not found';
  end if;

  select * into latest_request
  from public.hub_upgrade_requests
  where user_id = p_user_id and status = 'pending'
  order by requested_at desc
  limit 1;

  if found then
    resolved_status := case
      when coalesce(p_account_type, updated_profile.account_type) in ('member','admin')
       and coalesce(p_membership_status, updated_profile.membership_status) = 'active'
      then 'approved'
      when coalesce(p_membership_status, updated_profile.membership_status) in ('free','rejected','suspended')
      then 'rejected'
      else null
    end;

    if resolved_status is not null then
      update public.hub_upgrade_requests
      set status = resolved_status,
          reviewed_at = now(),
          reviewed_by = auth.uid(),
          reviewed_by_name = coalesce(admin_profile.full_name, admin_profile.email, 'JP Innovation admin'),
          rejection_reason = case when resolved_status = 'rejected' then coalesce(p_reason, '') else rejection_reason end,
          updated_at = now()
      where id = latest_request.id;

      update public.admin_notifications
      set status = 'read',
          read_at = coalesce(read_at, now())
      where target_id = latest_request.id::text
        and target_view = 'admin';

      insert into public.admin_notifications (
        user_id, title, detail, target_view, target_id, event_key
      ) values (
        p_user_id,
        case when resolved_status = 'approved' then 'Innovation Hub access approved' else 'Innovation Hub request updated' end,
        case when resolved_status = 'approved' then 'Your account now has Innovation Hub member access.' else 'Your Hub upgrade request has been reviewed by JP Innovation.' end,
        'dashboard',
        latest_request.id::text,
        'hub_upgrade_decision:' || latest_request.id::text
      );
    end if;
  end if;

  insert into public.admin_audit_log (
    admin_user_id, target_user_id, action, detail
  ) values (
    auth.uid(),
    p_user_id,
    'account_access_update',
    'Account type=' || coalesce(p_account_type, updated_profile.account_type) ||
    ', membership=' || coalesce(p_membership_status, updated_profile.membership_status)
  );

  return updated_profile;
end;
$$;

revoke all on function public.request_hub_access(text) from public;
grant execute on function public.request_hub_access(text) to authenticated;

revoke all on function public.admin_set_account_access(uuid,text,text,text,text) from public;
grant execute on function public.admin_set_account_access(uuid,text,text,text,text) to authenticated;
