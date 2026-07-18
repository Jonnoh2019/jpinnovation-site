-- JP Innovation analytics reset v3
-- Safe to run more than once.
-- Resets page-view analytics only; it does not delete users, profiles, posts, replies, projects, quotes, messages or registrations.

create or replace function public.admin_reset_site_analytics(p_scope text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  scope_value text := lower(coalesce(nullif(trim(p_scope), ''), 'all'));
  london_start timestamptz := timezone('Europe/London', date_trunc('day', timezone('Europe/London', now())));
  london_end timestamptz := timezone('Europe/London', date_trunc('day', timezone('Europe/London', now())) + interval '1 day');
begin
  if to_regclass('public.page_views') is null then
    raise exception 'Analytics table public.page_views is missing';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and lower(coalesce(p.account_type, p.role, '')) = 'admin'
      and coalesce(p.status, 'active') not in ('removed', 'archived', 'suspended')
      and coalesce(p.membership_status, 'active') <> 'suspended'
  ) then
    raise exception 'Admin access required for analytics reset';
  end if;

  if scope_value = 'today' then
    delete from public.page_views
    where created_at >= london_start
      and created_at < london_end;
    get diagnostics deleted_count = row_count;
  elsif scope_value = 'all' then
    select count(*) into deleted_count from public.page_views;
    truncate table public.page_views;
  else
    raise exception 'Invalid analytics reset scope: %', p_scope;
  end if;

  if to_regclass('public.admin_audit_log') is not null then
    insert into public.admin_audit_log(action, admin_id, reason, success, details)
    values (
      'metrics_reset',
      auth.uid(),
      scope_value,
      true,
      jsonb_build_object('scope', scope_value, 'deleted', deleted_count, 'timezone', 'Europe/London')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'scope', scope_value,
    'deleted', deleted_count,
    'timezone', 'Europe/London',
    'source_table', 'public.page_views'
  );
end;
$$;

revoke all on function public.admin_reset_site_analytics(text) from public;
grant execute on function public.admin_reset_site_analytics(text) to authenticated;

notify pgrst, 'reload schema';
