-- JP Innovation admin functions live-schema fix
-- Safe to run more than once.
--
-- This file only uses columns confirmed in the live database:
-- profiles: user_id, email, full_name, business, account_type, membership_status,
--           created_at, updated_at, vetted_at, reputation_points, status
-- admin_audit_log: id, admin_user_id, target_user_id, action, detail, created_at
-- admin_notifications: id, user_id, title, detail, target_view, target_id,
--                      event_key, status, created_at, read_at

create or replace function public.admin_remove_member(target_user uuid, removal_reason text default '')
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  member_profile public.profiles%rowtype;
begin
  if auth.uid() is null or not public.is_hub_admin() then
    raise exception 'Only admins can remove members';
  end if;

  select * into member_profile
  from public.profiles
  where user_id = target_user
  for update;

  if member_profile.user_id is null then
    raise exception 'Member profile not found';
  end if;

  if coalesce(member_profile.account_type, '') = 'admin' then
    raise exception 'Admin accounts cannot be removed from this control';
  end if;

  update public.profiles
  set status = 'removed',
      membership_status = 'removed',
      account_type = 'client',
      updated_at = now()
  where user_id = target_user
  returning * into member_profile;

  if to_regclass('public.admin_notifications') is not null then
    update public.admin_notifications
    set status = 'archived',
        read_at = coalesce(read_at, now())
    where user_id = target_user;
  end if;

  if to_regclass('public.admin_audit_log') is not null then
    insert into public.admin_audit_log(admin_user_id, target_user_id, action, detail)
    values (
      auth.uid(),
      target_user,
      'member_removed',
      'member=' || coalesce(member_profile.full_name, member_profile.email, target_user::text) ||
        ', reason=' || coalesce(removal_reason, '')
    );
  end if;

  return member_profile;
end;
$$;

revoke all on function public.admin_remove_member(uuid,text) from public;
grant execute on function public.admin_remove_member(uuid,text) to authenticated;

create or replace function public.resolve_moderation_item(
  p_submission_type text,
  p_submission_id text,
  p_status text,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_status text := coalesce(nullif(trim(p_status), ''), 'Pending');
  moderation_rows integer := 0;
  notification_rows integer := 0;
begin
  if auth.uid() is null or not public.is_hub_admin() then
    raise exception 'Only admins can resolve moderation';
  end if;

  if to_regclass('public.moderation_queue') is not null then
    execute
      'update public.moderation_queue
       set status = $1,
           moderation_notes = $2,
           assigned_reviewer = $3,
           resolved_at = case when $1 in (''Approved'',''Rejected'',''Removed'') then now() else null end,
           updated_at = now()
       where submission_type = $4 and submission_id = $5'
    using clean_status, coalesce(p_notes, ''), auth.uid(), p_submission_type, p_submission_id;
    get diagnostics moderation_rows = row_count;
  end if;

  if to_regclass('public.admin_notifications') is not null then
    update public.admin_notifications
    set status = case when clean_status in ('Approved','Rejected','Removed') then 'read' else status end,
        read_at = case when clean_status in ('Approved','Rejected','Removed') then coalesce(read_at, now()) else read_at end
    where target_id = p_submission_id
      and coalesce(target_view, '') in ('admin', 'moderation', p_submission_type);
    get diagnostics notification_rows = row_count;
  end if;

  if to_regclass('public.admin_audit_log') is not null then
    insert into public.admin_audit_log(admin_user_id, action, detail)
    values (
      auth.uid(),
      'moderation_' || lower(replace(clean_status, ' ', '_')),
      'submission_type=' || coalesce(p_submission_type, '') ||
        ', submission_id=' || coalesce(p_submission_id, '') ||
        ', notes=' || coalesce(p_notes, '')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', clean_status,
    'moderation_rows', moderation_rows,
    'notification_rows', notification_rows
  );
end;
$$;

revoke all on function public.resolve_moderation_item(text,text,text,text) from public;
grant execute on function public.resolve_moderation_item(text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
