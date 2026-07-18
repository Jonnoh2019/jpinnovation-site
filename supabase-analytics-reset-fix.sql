-- JP Innovation analytics reset fix
-- Run once in the Supabase SQL editor if Website Metrics reset shows "Analytics reset setup is missing".
-- This only deletes visitor/page-view rows from public.page_views.
-- It does not delete members, profiles, posts, replies, projects, quotes or messages.

create or replace function public.admin_reset_site_analytics(p_scope text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  scope_value text := lower(coalesce(p_scope, 'all'));
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.account_type = 'admin'
      and coalesce(profiles.status, 'active') <> 'removed'
      and coalesce(profiles.membership_status, 'active') <> 'suspended'
  ) then
    raise exception 'Admin access required';
  end if;

  if to_regclass('public.page_views') is null then
    raise exception 'Analytics table page_views is missing';
  end if;

  if scope_value = 'today' then
    delete from public.page_views
    where created_at >= date_trunc('day', now());
    get diagnostics deleted_count = row_count;
  elsif scope_value = 'all' then
    delete from public.page_views;
    get diagnostics deleted_count = row_count;
  else
    raise exception 'Invalid analytics reset scope: %', p_scope;
  end if;

  return jsonb_build_object(
    'ok', true,
    'scope', scope_value,
    'deleted', deleted_count
  );
end;
$$;

revoke all on function public.admin_reset_site_analytics(text) from public;
grant execute on function public.admin_reset_site_analytics(text) to authenticated;

notify pgrst, 'reload schema';
