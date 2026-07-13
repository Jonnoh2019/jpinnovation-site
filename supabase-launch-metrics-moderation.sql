-- JP Innovation launch metrics and reliable post moderation.
-- Run after the existing admin, analytics and engineering boards scripts.

alter table public.board_posts
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by_name text not null default '';

update public.board_posts
set approved_at = coalesce(approved_at, updated_at, created_at),
    approved_by_name = coalesce(nullif(approved_by_name, ''), 'JP Innovation admin')
where moderation_status = 'approved';

create table if not exists public.board_moderation_log (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  moderated_by uuid not null references auth.users(id) on delete cascade,
  moderated_by_name text not null,
  moderated_at timestamptz not null default now()
);

create index if not exists board_moderation_log_post_idx
  on public.board_moderation_log(post_id, moderated_at desc);

alter table public.board_moderation_log enable row level security;

drop policy if exists "Admins read board moderation history" on public.board_moderation_log;
create policy "Admins read board moderation history"
on public.board_moderation_log for select to authenticated
using (public.is_hub_admin());

create or replace function public.moderate_board_post(p_post_id uuid, p_status text)
returns setof public.board_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
  admin_name text;
begin
  if not public.is_hub_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'Invalid moderation status';
  end if;

  select moderation_status into previous_status
  from public.board_posts
  where id = p_post_id
  for update;

  if previous_status is null then
    raise exception 'Post not found';
  end if;

  select coalesce(nullif(full_name, ''), 'JP Innovation admin') into admin_name
  from public.profiles
  where user_id = auth.uid();
  admin_name := coalesce(admin_name, 'JP Innovation admin');

  update public.board_posts
  set moderation_status = p_status,
      flagged = case when p_status = 'approved' then false else flagged end,
      approved_at = case when p_status = 'approved' then now() else null end,
      approved_by = case when p_status = 'approved' then auth.uid() else null end,
      approved_by_name = case when p_status = 'approved' then admin_name else '' end,
      updated_at = now()
  where id = p_post_id;

  insert into public.board_moderation_log (
    post_id, previous_status, new_status, moderated_by, moderated_by_name
  ) values (
    p_post_id, previous_status, p_status, auth.uid(), admin_name
  );

  return query select * from public.board_posts where id = p_post_id;
end;
$$;

revoke all on function public.moderate_board_post(uuid, text) from public;
grant execute on function public.moderate_board_post(uuid, text) to authenticated;

create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_hub_admin() then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'total_website_visits', (select count(*) from public.page_views),
    'unique_visitors', (select count(distinct visitor_id) from public.page_views where visitor_id is not null),
    'member_registrations', (select count(*) from public.profiles where account_type = 'member'),
    'client_registrations', (select count(*) from public.profiles where account_type = 'client'),
    'posts_created', (select count(*) from public.board_posts),
    'active_members', (select count(*) from public.profiles where account_type = 'member' and membership_status = 'active')
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public;
grant execute on function public.admin_dashboard_metrics() to authenticated;

grant select on public.board_moderation_log to authenticated;
