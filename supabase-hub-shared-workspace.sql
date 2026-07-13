-- JP Innovation shared Hub workspace
-- Run once after supabase-admin-portal.sql, supabase-engineering-boards.sql
-- and supabase-content-workflow.sql.

create extension if not exists pgcrypto;

create table if not exists public.hub_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_email text not null,
  recipient_name text not null,
  recipient_email text not null,
  subject text not null check (char_length(subject) between 1 and 180),
  body text not null check (char_length(body) between 1 and 8000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hub_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (char_length(resource_type) between 2 and 80),
  title text not null check (char_length(title) between 2 and 180),
  detail text not null check (char_length(detail) between 2 and 5000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 180),
  event_type text not null check (char_length(event_type) between 2 and 80),
  event_date date not null,
  location text not null check (char_length(location) between 2 and 180),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_event_interests (
  event_id uuid not null references public.hub_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.hub_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.hub_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hub_project_parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.hub_projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  material text not null default '',
  part_status text not null default 'Open',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hub_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.hub_projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists hub_messages_participants_idx on public.hub_messages(recipient_id, sender_id, created_at desc);
create index if not exists hub_resources_created_idx on public.hub_resources(created_at desc);
create index if not exists hub_events_date_idx on public.hub_events(event_date, created_at desc);
create index if not exists hub_project_updates_project_idx on public.hub_project_updates(project_id, created_at desc);
create index if not exists hub_project_parts_project_idx on public.hub_project_parts(project_id, created_at);
create index if not exists hub_project_comments_project_idx on public.hub_project_comments(project_id, created_at desc);

create or replace function public.touch_hub_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hub_resources_updated_at on public.hub_resources;
create trigger hub_resources_updated_at before update on public.hub_resources
for each row execute function public.touch_hub_updated_at();

drop trigger if exists hub_events_updated_at on public.hub_events;
create trigger hub_events_updated_at before update on public.hub_events
for each row execute function public.touch_hub_updated_at();

create or replace function public.can_read_hub_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hub_projects project
    where project.id = project_uuid
      and (
        public.is_hub_admin()
        or project.author_id = auth.uid()
        or (public.is_hub_member() and project.moderation_status = 'approved')
      )
  );
$$;

revoke all on function public.can_read_hub_project(uuid) from public;
grant execute on function public.can_read_hub_project(uuid) to authenticated;

create or replace function public.hub_message_directory()
returns table (
  user_id uuid,
  email text,
  full_name text,
  business text,
  account_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select profile.user_id, profile.email, profile.full_name, profile.business, profile.account_type
  from public.profiles profile
  where profile.user_id <> auth.uid()
    and coalesce(profile.membership_status, 'free') not in ('suspended', 'cancelled', 'rejected')
    and (
      public.is_hub_admin()
      or (public.is_hub_member() and profile.account_type in ('member', 'admin') and profile.membership_status = 'active')
      or (not public.is_hub_member() and profile.account_type = 'admin')
    )
  order by profile.full_name, profile.email;
$$;

revoke all on function public.hub_message_directory() from public;
grant execute on function public.hub_message_directory() to authenticated;

create or replace function public.send_hub_message(
  recipient_email text,
  message_subject text,
  message_body text
)
returns public.hub_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_profile public.profiles%rowtype;
  recipient_profile public.profiles%rowtype;
  created_message public.hub_messages%rowtype;
begin
  if char_length(trim(message_subject)) not between 1 and 180
    or char_length(trim(message_body)) not between 1 and 8000 then
    raise exception 'Enter a subject and message before sending';
  end if;

  select * into sender_profile from public.profiles where user_id = auth.uid();
  select * into recipient_profile from public.profiles where lower(email) = lower(trim(recipient_email));

  if sender_profile.user_id is null or recipient_profile.user_id is null then
    raise exception 'The selected recipient is not available';
  end if;

  if not (
    public.is_hub_admin()
    or (public.is_hub_member() and recipient_profile.account_type in ('member', 'admin') and recipient_profile.membership_status = 'active')
    or (sender_profile.account_type = 'client' and recipient_profile.account_type = 'admin')
  ) then
    raise exception 'This account cannot message the selected recipient';
  end if;

  insert into public.hub_messages (
    sender_id, recipient_id, sender_name, sender_email,
    recipient_name, recipient_email, subject, body
  ) values (
    sender_profile.user_id, recipient_profile.user_id,
    coalesce(nullif(sender_profile.full_name, ''), sender_profile.email), sender_profile.email,
    coalesce(nullif(recipient_profile.full_name, ''), recipient_profile.email), recipient_profile.email,
    trim(message_subject), trim(message_body)
  ) returning * into created_message;

  return created_message;
end;
$$;

revoke all on function public.send_hub_message(text, text, text) from public;
grant execute on function public.send_hub_message(text, text, text) to authenticated;

create or replace function public.mark_hub_messages_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.hub_messages
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;

revoke all on function public.mark_hub_messages_read() from public;
grant execute on function public.mark_hub_messages_read() to authenticated;

alter table public.hub_messages enable row level security;
alter table public.hub_resources enable row level security;
alter table public.hub_events enable row level security;
alter table public.hub_event_interests enable row level security;
alter table public.hub_project_updates enable row level security;
alter table public.hub_project_parts enable row level security;
alter table public.hub_project_comments enable row level security;

drop policy if exists "Message participants read private messages" on public.hub_messages;
create policy "Message participants read private messages" on public.hub_messages
for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_hub_admin());

drop policy if exists "Message participants remove private messages" on public.hub_messages;
create policy "Message participants remove private messages" on public.hub_messages
for delete to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_hub_admin());

drop policy if exists "Hub members read resources" on public.hub_resources;
create policy "Hub members read resources" on public.hub_resources
for select to authenticated using (public.is_hub_member());

drop policy if exists "Admins create resources" on public.hub_resources;
create policy "Admins create resources" on public.hub_resources
for insert to authenticated with check (public.is_hub_admin() and created_by = auth.uid());

drop policy if exists "Admins update resources" on public.hub_resources;
create policy "Admins update resources" on public.hub_resources
for update to authenticated using (public.is_hub_admin()) with check (public.is_hub_admin());

drop policy if exists "Admins delete resources" on public.hub_resources;
create policy "Admins delete resources" on public.hub_resources
for delete to authenticated using (public.is_hub_admin());

drop policy if exists "Hub members read events" on public.hub_events;
create policy "Hub members read events" on public.hub_events
for select to authenticated using (public.is_hub_member());

drop policy if exists "Admins create events" on public.hub_events;
create policy "Admins create events" on public.hub_events
for insert to authenticated with check (public.is_hub_admin() and created_by = auth.uid());

drop policy if exists "Admins update events" on public.hub_events;
create policy "Admins update events" on public.hub_events
for update to authenticated using (public.is_hub_admin()) with check (public.is_hub_admin());

drop policy if exists "Admins delete events" on public.hub_events;
create policy "Admins delete events" on public.hub_events
for delete to authenticated using (public.is_hub_admin());

drop policy if exists "Hub members read event interest" on public.hub_event_interests;
create policy "Hub members read event interest" on public.hub_event_interests
for select to authenticated using (public.is_hub_member());

drop policy if exists "Members register event interest" on public.hub_event_interests;
create policy "Members register event interest" on public.hub_event_interests
for insert to authenticated with check (public.is_hub_member() and user_id = auth.uid());

drop policy if exists "Members remove event interest" on public.hub_event_interests;
create policy "Members remove event interest" on public.hub_event_interests
for delete to authenticated using (user_id = auth.uid() or public.is_hub_admin());

drop policy if exists "Project readers see updates" on public.hub_project_updates;
create policy "Project readers see updates" on public.hub_project_updates
for select to authenticated using (public.can_read_hub_project(project_id));

drop policy if exists "Project owners add updates" on public.hub_project_updates;
create policy "Project owners add updates" on public.hub_project_updates
for insert to authenticated with check (
  created_by = auth.uid() and exists (
    select 1 from public.hub_projects project
    where project.id = project_id and (project.author_id = auth.uid() or public.is_hub_admin())
  )
);

drop policy if exists "Project owners remove updates" on public.hub_project_updates;
create policy "Project owners remove updates" on public.hub_project_updates
for delete to authenticated using (
  exists (select 1 from public.hub_projects project where project.id = project_id and (project.author_id = auth.uid() or public.is_hub_admin()))
);

drop policy if exists "Project readers see parts" on public.hub_project_parts;
create policy "Project readers see parts" on public.hub_project_parts
for select to authenticated using (public.can_read_hub_project(project_id));

drop policy if exists "Project owners add parts" on public.hub_project_parts;
create policy "Project owners add parts" on public.hub_project_parts
for insert to authenticated with check (
  created_by = auth.uid() and exists (
    select 1 from public.hub_projects project
    where project.id = project_id and (project.author_id = auth.uid() or public.is_hub_admin())
  )
);

drop policy if exists "Project owners remove parts" on public.hub_project_parts;
create policy "Project owners remove parts" on public.hub_project_parts
for delete to authenticated using (
  exists (select 1 from public.hub_projects project where project.id = project_id and (project.author_id = auth.uid() or public.is_hub_admin()))
);

drop policy if exists "Project readers see comments" on public.hub_project_comments;
create policy "Project readers see comments" on public.hub_project_comments
for select to authenticated using (public.can_read_hub_project(project_id));

drop policy if exists "Hub members add project comments" on public.hub_project_comments;
create policy "Hub members add project comments" on public.hub_project_comments
for insert to authenticated with check (
  public.is_hub_member() and public.can_read_hub_project(project_id) and author_id = auth.uid()
);

drop policy if exists "Comment owners remove comments" on public.hub_project_comments;
create policy "Comment owners remove comments" on public.hub_project_comments
for delete to authenticated using (author_id = auth.uid() or public.is_hub_admin());

grant select, delete on public.hub_messages to authenticated;
grant select, insert, update, delete on public.hub_resources to authenticated;
grant select, insert, update, delete on public.hub_events to authenticated;
grant select, insert, delete on public.hub_event_interests to authenticated;
grant select, insert, delete on public.hub_project_updates to authenticated;
grant select, insert, delete on public.hub_project_parts to authenticated;
grant select, insert, delete on public.hub_project_comments to authenticated;
