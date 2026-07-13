-- JP Innovation live admin access controls
-- Run once in the Supabase SQL editor before launch.

alter table public.profiles
  add column if not exists membership_status text not null default 'free';

update public.profiles
set account_type = 'admin', membership_status = 'active'
where lower(email) = 'jpinnovation.enquiries@gmail.com';

create or replace function public.is_hub_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and account_type = 'admin'
  );
$$;

revoke all on function public.is_hub_admin() from public;
grant execute on function public.is_hub_admin() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select to authenticated
using (public.is_hub_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update to authenticated
using (public.is_hub_admin())
with check (public.is_hub_admin());

create or replace function public.request_hub_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set membership_status = 'pending'
  where user_id = auth.uid()
    and account_type = 'client'
    and coalesce(membership_status, 'free') not in ('active', 'suspended');
end;
$$;

revoke all on function public.request_hub_access() from public;
grant execute on function public.request_hub_access() to authenticated;

-- Keep every Supabase Auth registration represented in Admin Review.
create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id, email, full_name, business, account_type, membership_status
  ) values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'business', ''),
    case when lower(new.email) = 'jpinnovation.enquiries@gmail.com' then 'admin' else 'client' end,
    case
      when lower(new.email) = 'jpinnovation.enquiries@gmail.com' then 'active'
      when coalesce(new.raw_user_meta_data ->> 'requested_access', '') = 'hub' then 'pending'
      else 'free'
    end
  )
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_portal_profile on auth.users;
create trigger on_auth_user_created_create_portal_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_portal_user();

insert into public.profiles (user_id, email, full_name, business, account_type, membership_status)
select
  auth_user.id,
  lower(auth_user.email),
  coalesce(auth_user.raw_user_meta_data ->> 'full_name', ''),
  coalesce(auth_user.raw_user_meta_data ->> 'business', ''),
  case when lower(auth_user.email) = 'jpinnovation.enquiries@gmail.com' then 'admin' else 'client' end,
  case
    when lower(auth_user.email) = 'jpinnovation.enquiries@gmail.com' then 'active'
    when coalesce(auth_user.raw_user_meta_data ->> 'requested_access', '') = 'hub' then 'pending'
    else 'free'
  end
from auth.users auth_user
left join public.profiles profile on profile.user_id = auth_user.id
where profile.user_id is null
on conflict (user_id) do nothing;

update public.profiles profile
set membership_status = 'pending', updated_at = now()
from auth.users auth_user
where profile.user_id = auth_user.id
  and profile.account_type = 'client'
  and profile.membership_status = 'free'
  and coalesce(auth_user.raw_user_meta_data ->> 'requested_access', '') = 'hub';
