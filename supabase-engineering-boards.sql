-- JP Innovation Engineering Boards
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.is_hub_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and account_type in ('member', 'admin')
      and coalesce(membership_status, 'active') not in ('suspended', 'cancelled')
  );
$$;

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

revoke all on function public.is_hub_member() from public;
revoke all on function public.is_hub_admin() from public;
grant execute on function public.is_hub_member() to authenticated;
grant execute on function public.is_hub_admin() to authenticated;

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  category text not null check (char_length(category) between 2 and 80),
  body text not null check (char_length(body) between 3 and 8000),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 120),
  flagged boolean not null default false,
  reports integer not null default 0 check (reports >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_posts
  add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending', 'approved', 'rejected'));

create table if not exists public.board_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 120),
  helpful boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_replies
  add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending', 'approved', 'rejected'));

create index if not exists board_posts_created_at_idx on public.board_posts(created_at desc);
create index if not exists board_posts_category_idx on public.board_posts(category);
create index if not exists board_posts_moderation_idx on public.board_posts(moderation_status, created_at desc);
create index if not exists board_replies_post_id_idx on public.board_replies(post_id, created_at);
create index if not exists board_replies_moderation_idx on public.board_replies(moderation_status, created_at desc);

create or replace function public.set_board_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists board_posts_updated_at on public.board_posts;
create trigger board_posts_updated_at before update on public.board_posts
for each row execute function public.set_board_updated_at();

drop trigger if exists board_replies_updated_at on public.board_replies;
create trigger board_replies_updated_at before update on public.board_replies
for each row execute function public.set_board_updated_at();

alter table public.board_posts enable row level security;
alter table public.board_replies enable row level security;

drop policy if exists "Hub members read board posts" on public.board_posts;
create policy "Hub members read board posts" on public.board_posts
for select to authenticated using (
  public.is_hub_member()
  and (moderation_status = 'approved' or author_id = auth.uid() or public.is_hub_admin())
);

drop policy if exists "Hub members create own board posts" on public.board_posts;
create policy "Hub members create own board posts" on public.board_posts
for insert to authenticated with check (
  public.is_hub_member() and author_id = auth.uid() and moderation_status = 'pending'
);

drop policy if exists "Owners update board posts" on public.board_posts;
create policy "Owners update board posts" on public.board_posts
for update to authenticated
using (author_id = auth.uid() or public.is_hub_admin())
with check (public.is_hub_admin() or (author_id = auth.uid() and moderation_status = 'pending'));

drop policy if exists "Owners delete board posts" on public.board_posts;
create policy "Owners delete board posts" on public.board_posts
for delete to authenticated using (author_id = auth.uid() or public.is_hub_admin());

drop policy if exists "Hub members read board replies" on public.board_replies;
create policy "Hub members read board replies" on public.board_replies
for select to authenticated using (
  public.is_hub_member()
  and (moderation_status = 'approved' or author_id = auth.uid() or public.is_hub_admin())
);

drop policy if exists "Hub members create own board replies" on public.board_replies;
create policy "Hub members create own board replies" on public.board_replies
for insert to authenticated with check (
  public.is_hub_member() and author_id = auth.uid() and moderation_status = 'pending'
);

drop policy if exists "Owners update board replies" on public.board_replies;
create policy "Owners update board replies" on public.board_replies
for update to authenticated
using (author_id = auth.uid() or public.is_hub_admin())
with check (public.is_hub_admin() or (author_id = auth.uid() and moderation_status = 'pending'));

drop policy if exists "Owners delete board replies" on public.board_replies;
create policy "Owners delete board replies" on public.board_replies
for delete to authenticated using (author_id = auth.uid() or public.is_hub_admin());

create or replace function public.mark_board_reply_helpful(reply_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.board_replies r
    join public.board_posts p on p.id = r.post_id
    where r.id = reply_uuid
      and (p.author_id = auth.uid() or public.is_hub_admin())
      and r.author_id <> p.author_id
      and r.moderation_status = 'approved'
  ) then
    raise exception 'Only the post owner can mark another member reply as helpful';
  end if;

  update public.board_replies set helpful = true where id = reply_uuid;
end;
$$;

revoke all on function public.mark_board_reply_helpful(uuid) from public;
grant execute on function public.mark_board_reply_helpful(uuid) to authenticated;
grant select, insert, update, delete on public.board_posts to authenticated;
grant select, insert, update, delete on public.board_replies to authenticated;
