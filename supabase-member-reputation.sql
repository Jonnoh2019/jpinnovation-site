-- JP Innovation Hub member verification, reputation and moderated reviews.
-- Run after supabase-admin-portal.sql and supabase-engineering-boards.sql.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists vetted_at timestamptz,
  add column if not exists reputation_points integer not null default 0;

update public.profiles
set vetted_at = coalesce(vetted_at, updated_at, now())
where account_type in ('member', 'admin')
  and membership_status = 'active'
  and vetted_at is null;

create table if not exists public.member_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewed_user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  reviewed_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 20 and 2000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reviewer_id, reviewed_user_id),
  check (reviewer_id <> reviewed_user_id)
);

create index if not exists member_reviews_reviewed_status_idx
  on public.member_reviews(reviewed_user_id, moderation_status, created_at desc);

alter table public.member_reviews enable row level security;

drop policy if exists "Approved reviews are visible to Hub members" on public.member_reviews;
create policy "Approved reviews are visible to Hub members"
on public.member_reviews for select to authenticated
using (
  moderation_status = 'approved'
  or reviewer_id = auth.uid()
  or reviewed_user_id = auth.uid()
  or public.is_hub_admin()
);

drop policy if exists "Admins can update member reviews" on public.member_reviews;
create policy "Admins can update member reviews"
on public.member_reviews for update to authenticated
using (public.is_hub_admin())
with check (public.is_hub_admin());

create or replace function public.submit_member_review(
  reviewed_user uuid,
  review_rating integer,
  review_comment text
)
returns public.member_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_profile public.profiles%rowtype;
  reviewed_profile public.profiles%rowtype;
  saved_review public.member_reviews%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to leave a review'; end if;
  if reviewed_user = auth.uid() then raise exception 'You cannot review your own profile'; end if;
  if review_rating not between 1 and 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  if char_length(trim(coalesce(review_comment, ''))) < 20 then
    raise exception 'Add a review comment of at least 20 characters';
  end if;

  select * into reviewer_profile from public.profiles where user_id = auth.uid();
  select * into reviewed_profile from public.profiles where user_id = reviewed_user;

  if reviewer_profile.user_id is null or reviewer_profile.account_type not in ('member', 'admin')
     or reviewer_profile.membership_status <> 'active' then
    raise exception 'Only active Hub members can leave reviews';
  end if;
  if reviewed_profile.user_id is null or reviewed_profile.account_type not in ('member', 'admin')
     or reviewed_profile.membership_status <> 'active' then
    raise exception 'This profile is not available for Hub reviews';
  end if;

  insert into public.member_reviews (
    reviewer_id, reviewed_user_id, reviewer_name, reviewed_name, rating, comment,
    moderation_status, approved_at, approved_by, approved_by_name, updated_at
  ) values (
    auth.uid(), reviewed_user,
    coalesce(nullif(reviewer_profile.full_name, ''), reviewer_profile.email),
    coalesce(nullif(reviewed_profile.full_name, ''), reviewed_profile.email),
    review_rating, trim(review_comment), 'pending', null, null, null, now()
  )
  on conflict (reviewer_id, reviewed_user_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    reviewer_name = excluded.reviewer_name,
    reviewed_name = excluded.reviewed_name,
    moderation_status = 'pending',
    approved_at = null,
    approved_by = null,
    approved_by_name = null,
    updated_at = now()
  returning * into saved_review;

  return saved_review;
end;
$$;

revoke all on function public.submit_member_review(uuid, integer, text) from public;
grant execute on function public.submit_member_review(uuid, integer, text) to authenticated;

create or replace function public.moderate_member_review(
  review_uuid uuid,
  next_status text
)
returns public.member_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_name text;
  saved_review public.member_reviews%rowtype;
begin
  if not public.is_hub_admin() then raise exception 'Admin access required'; end if;
  if next_status not in ('approved', 'rejected') then raise exception 'Invalid review status'; end if;

  select coalesce(nullif(full_name, ''), email)
  into admin_name
  from public.profiles where user_id = auth.uid();

  update public.member_reviews set
    moderation_status = next_status,
    approved_at = case when next_status = 'approved' then now() else null end,
    approved_by = case when next_status = 'approved' then auth.uid() else null end,
    approved_by_name = case when next_status = 'approved' then admin_name else null end,
    updated_at = now()
  where id = review_uuid
  returning * into saved_review;

  if saved_review.id is null then raise exception 'Review not found'; end if;
  return saved_review;
end;
$$;

revoke all on function public.moderate_member_review(uuid, text) from public;
grant execute on function public.moderate_member_review(uuid, text) to authenticated;

create or replace function public.hub_member_reputation()
returns table (
  user_id uuid,
  reputation_points integer,
  approved_positive_reviews bigint,
  approved_review_count bigint,
  average_rating numeric,
  badge_tier text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.user_id,
    greatest(coalesce(profile.reputation_points, 0), 0) as reputation_points,
    count(review.id) filter (where review.moderation_status = 'approved' and review.rating >= 4) as approved_positive_reviews,
    count(review.id) filter (where review.moderation_status = 'approved') as approved_review_count,
    round(avg(review.rating) filter (where review.moderation_status = 'approved'), 1) as average_rating,
    case
      when profile.account_type not in ('member', 'admin')
        or profile.membership_status <> 'active'
        or profile.vetted_at is null then 'none'
      when greatest(coalesce(profile.reputation_points, 0), 0) >= 100
        or count(review.id) filter (where review.moderation_status = 'approved' and review.rating >= 4) >= 3 then 'gold'
      else 'blue'
    end as badge_tier
  from public.profiles profile
  left join public.member_reviews review on review.reviewed_user_id = profile.user_id
  where profile.account_type in ('member', 'admin')
    and profile.membership_status = 'active'
    and (public.is_hub_member() or public.is_hub_admin())
  group by profile.user_id, profile.account_type, profile.membership_status, profile.vetted_at, profile.reputation_points
  order by profile.full_name, profile.email;
$$;

revoke all on function public.hub_member_reputation() from public;
grant execute on function public.hub_member_reputation() to authenticated;

create or replace function public.award_helpful_reply_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.helpful = true and coalesce(old.helpful, false) = false then
    update public.profiles
    set reputation_points = greatest(coalesce(reputation_points, 0), 0) + 10,
        updated_at = now()
    where user_id = new.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists board_reply_award_reputation_points on public.board_replies;
create trigger board_reply_award_reputation_points
after update of helpful on public.board_replies
for each row execute function public.award_helpful_reply_points();

update public.profiles profile
set reputation_points = greatest(
  coalesce(profile.reputation_points, 0),
  coalesce((select count(*) * 10 from public.board_replies reply where reply.author_id = profile.user_id and reply.helpful = true), 0)
);
