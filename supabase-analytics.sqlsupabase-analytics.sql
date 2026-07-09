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
