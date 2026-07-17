-- JP Innovation private website analytics
-- Run this once in Supabase SQL editor.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  page_path text not null,
  page_title text,
  referrer text,
  device_type text,
  viewport_width integer
);

alter table public.page_views enable row level security;

drop policy if exists "Anyone can add anonymous page views" on public.page_views;
create policy "Anyone can add anonymous page views"
on public.page_views
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read page views" on public.page_views;
create policy "Admins can read page views"
on public.page_views
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.account_type = 'admin'
  )
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_visitor_day_idx on public.page_views (visitor_id, created_at desc);
create index if not exists page_views_path_idx on public.page_views (page_path);

create or replace function public.admin_reset_site_analytics(p_scope text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.account_type = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if coalesce(p_scope, 'all') = 'today' then
    delete from public.page_views
    where created_at >= date_trunc('day', now());
    get diagnostics deleted_count = row_count;
  elsif coalesce(p_scope, 'all') = 'all' then
    delete from public.page_views;
    get diagnostics deleted_count = row_count;
  else
    raise exception 'Invalid analytics reset scope';
  end if;

  return jsonb_build_object(
    'scope', coalesce(p_scope, 'all'),
    'deleted', deleted_count
  );
end;
$$;

revoke all on function public.admin_reset_site_analytics(text) from public;
grant execute on function public.admin_reset_site_analytics(text) to authenticated;
