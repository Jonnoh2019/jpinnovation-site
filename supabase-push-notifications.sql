-- JP Innovation phone notification subscriptions.
-- Run this in Supabase SQL before enabling the live push sender.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read their own push subscriptions" on public.push_subscriptions;
create policy "Users can read their own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can register their own push subscriptions" on public.push_subscriptions;
create policy "Users can register their own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own push subscriptions" on public.push_subscriptions;
create policy "Users can remove their own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id, enabled);
create index if not exists push_subscriptions_email_idx on public.push_subscriptions(lower(email));
