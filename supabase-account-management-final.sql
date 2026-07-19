-- JP Innovation Hub account management final RPC
-- Run once in Supabase SQL editor.
-- Provides a single persistent backend path for admin account actions used by hub-portal/admin-member-management-final.js.

alter table public.profiles add column if not exists warning_at timestamptz;
alter table public.profiles add column if not exists warning_reason text;
alter table public.profiles add column if not exists removed_at timestamptz;
alter table public.profiles add column if not exists removal_reason text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

create or replace function public.admin_manage_account(
  p_user_id uuid,
  p_action text,
  p_reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  next_membership text;
begin
  select * into admin_profile
  from public.profiles
  where user_id = auth.uid();

  if admin_profile.user_id is null or coalesce(admin_profile.account_type, '') <> 'admin' then
    raise exception 'Only JP Innovation admins can manage accounts.';
  end if;

  select * into target_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if target_profile.user_id is null then
    raise exception 'Account not found.';
  end if;

  if target_profile.user_id = admin_profile.user_id and lower(coalesce(p_action, '')) in ('downgrade','suspend','reactivate','restore','remove','archive') then
    raise exception 'Admins cannot downgrade, suspend, reactivate or remove their own account.';
  end if;

  if lower(coalesce(p_action, '')) = 'upgrade' then
    update public.profiles
    set account_type = 'member',
        membership_status = 'active',
        status = 'active',
        vetted_at = coalesce(vetted_at, now()),
        removed_at = null,
        removal_reason = null,
        updated_at = now()
    where user_id = p_user_id
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) = 'downgrade' then
    update public.profiles
    set account_type = 'client',
        membership_status = 'free',
        vetted_at = null,
        status = 'active',
        updated_at = now()
    where user_id = p_user_id
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) = 'verify' then
    update public.profiles
    set vetted_at = now(),
        membership_status = case when account_type in ('member','admin') then 'active' else coalesce(membership_status, 'free') end,
        status = 'active',
        updated_at = now()
    where user_id = p_user_id
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) in ('unverify','remove_verification','remove verification') then
    update public.profiles
    set vetted_at = null,
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) = 'warn' then
    update public.profiles
    set warning_at = now(),
        warning_reason = nullif(trim(p_reason), ''),
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) in ('unwarn','remove_warning','remove warning') then
    update public.profiles
    set warning_at = null,
        warning_reason = null,
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) = 'suspend' then
    update public.profiles
    set membership_status = 'suspended',
        status = 'active',
        removal_reason = nullif(trim(p_reason), ''),
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) in ('reactivate','restore') then
    next_membership := case when target_profile.account_type = 'client' then 'free' else 'active' end;
    update public.profiles
    set membership_status = next_membership,
        status = 'active',
        removed_at = null,
        removal_reason = null,
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  elsif lower(coalesce(p_action, '')) in ('remove','archive') then
    update public.profiles
    set membership_status = 'removed',
        status = 'removed',
        removed_at = now(),
        removal_reason = coalesce(nullif(trim(p_reason), ''), 'Archived by JP Innovation admin'),
        updated_at = now()
    where user_id = p_user_id
      and account_type <> 'admin'
    returning * into target_profile;

  else
    raise exception 'Unsupported account action: %', p_action;
  end if;

  -- Resolve upgrade request rows if that table exists in this project.
  begin
    if lower(coalesce(p_action, '')) = 'upgrade' then
      update public.hub_upgrade_requests
      set status = 'approved', reviewed_at = now(), reviewed_by = admin_profile.user_id
      where user_id = p_user_id and status = 'pending';
    elsif lower(coalesce(p_action, '')) in ('downgrade','remove','archive') then
      update public.hub_upgrade_requests
      set status = 'rejected', reviewed_at = now(), reviewed_by = admin_profile.user_id
      where user_id = p_user_id and status = 'pending';
    end if;
  exception when undefined_table or undefined_column then
    null;
  end;

  return target_profile;
end;
$$;

revoke all on function public.admin_manage_account(uuid,text,text) from public;
grant execute on function public.admin_manage_account(uuid,text,text) to authenticated;
