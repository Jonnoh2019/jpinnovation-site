-- JP Innovation shared project and quote approval workflow
-- Run once in the Supabase SQL editor after supabase-admin-portal.sql.

create extension if not exists pgcrypto;

create table if not exists public.hub_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  category text not null check (char_length(category) between 2 and 80),
  description text not null check (char_length(description) between 3 and 8000),
  location text not null default '',
  progress_status text not null default 'Planning',
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  service text not null check (char_length(service) between 2 and 180),
  location text not null default '',
  material text not null default '',
  quantity text not null default '',
  budget text not null default '',
  deadline text not null default '',
  outcome text not null default '',
  tolerance text not null default '',
  description text not null check (char_length(description) between 3 and 8000),
  files_note text not null default '',
  status text not null default 'jp-review'
    check (status in ('jp-review', 'open', 'shortlisted', 'closed')),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  responses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  provider_name text not null,
  provider_email text not null,
  price text not null default '',
  lead_time text not null default '',
  assumptions text not null default '',
  availability text not null default '',
  notes text not null default '',
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create index if not exists hub_projects_review_idx on public.hub_projects(moderation_status, created_at desc);
create index if not exists quote_requests_review_idx on public.quote_requests(status, created_at desc);
create index if not exists quote_responses_request_idx on public.quote_responses(request_id, created_at desc);

alter table public.hub_projects enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_responses enable row level security;

drop policy if exists "Approved projects are visible to Hub members" on public.hub_projects;
create policy "Approved projects are visible to Hub members" on public.hub_projects
for select to authenticated using (
  public.is_hub_admin()
  or author_id = auth.uid()
  or (public.is_hub_member() and moderation_status = 'approved')
);

drop policy if exists "Hub members submit projects for review" on public.hub_projects;
create policy "Hub members submit projects for review" on public.hub_projects
for insert to authenticated with check (
  public.is_hub_member() and author_id = auth.uid() and moderation_status = 'pending'
);

drop policy if exists "Admins moderate projects" on public.hub_projects;
create policy "Admins moderate projects" on public.hub_projects
for update to authenticated using (public.is_hub_admin()) with check (public.is_hub_admin());

drop policy if exists "Owners remove pending projects" on public.hub_projects;
create policy "Owners remove pending projects" on public.hub_projects
for delete to authenticated using (public.is_hub_admin() or (author_id = auth.uid() and moderation_status = 'pending'));

drop policy if exists "Private quote workflow visibility" on public.quote_requests;
create policy "Private quote workflow visibility" on public.quote_requests
for select to authenticated using (
  public.is_hub_admin()
  or author_id = auth.uid()
  or (public.is_hub_member() and status in ('open', 'shortlisted'))
);

drop policy if exists "Authenticated users submit quote requests" on public.quote_requests;
create policy "Authenticated users submit quote requests" on public.quote_requests
for insert to authenticated with check (author_id = auth.uid() and status = 'jp-review');

drop policy if exists "Admins manage quote requests" on public.quote_requests;
create policy "Admins manage quote requests" on public.quote_requests
for update to authenticated using (public.is_hub_admin()) with check (public.is_hub_admin());

drop policy if exists "Owners remove pending quote requests" on public.quote_requests;
create policy "Owners remove pending quote requests" on public.quote_requests
for delete to authenticated using (public.is_hub_admin() or (author_id = auth.uid() and status = 'jp-review'));

drop policy if exists "Private quote responses are restricted" on public.quote_responses;
create policy "Private quote responses are restricted" on public.quote_responses
for select to authenticated using (
  public.is_hub_admin()
  or provider_id = auth.uid()
  or exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.author_id = auth.uid()
  )
);

drop policy if exists "Hub members submit private quote responses" on public.quote_responses;
create policy "Hub members submit private quote responses" on public.quote_responses
for insert to authenticated with check (
  public.is_hub_member()
  and provider_id = auth.uid()
  and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.status in ('open', 'shortlisted')
  )
);

drop policy if exists "Providers manage own quote responses" on public.quote_responses;
create policy "Providers manage own quote responses" on public.quote_responses
for update to authenticated using (provider_id = auth.uid() or public.is_hub_admin())
with check (provider_id = auth.uid() or public.is_hub_admin());

drop policy if exists "Providers remove own quote responses" on public.quote_responses;
create policy "Providers remove own quote responses" on public.quote_responses
for delete to authenticated using (provider_id = auth.uid() or public.is_hub_admin());

grant select, insert, update, delete on public.hub_projects to authenticated;
grant select, insert, update, delete on public.quote_requests to authenticated;
grant select, insert, update, delete on public.quote_responses to authenticated;


