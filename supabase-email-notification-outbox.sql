-- Provider-neutral email notification queue.
-- Connect a Supabase Edge Function to Resend (or another provider) to deliver queued rows.

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  event_type text not null,
  subject text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_queue_idx
  on public.notification_outbox(delivery_status, created_at);

alter table public.notification_outbox enable row level security;

drop policy if exists "Admins read notification queue" on public.notification_outbox;
create policy "Admins read notification queue"
on public.notification_outbox for select to authenticated
using (public.is_hub_admin());

drop policy if exists "Admins update notification queue" on public.notification_outbox;
create policy "Admins update notification queue"
on public.notification_outbox for update to authenticated
using (public.is_hub_admin()) with check (public.is_hub_admin());

create or replace function public.queue_notification(
  p_recipient text,
  p_event_type text,
  p_subject text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_recipient), '') is null then return; end if;
  insert into public.notification_outbox(recipient_email,event_type,subject,body,payload)
  values(lower(trim(p_recipient)),p_event_type,p_subject,p_body,coalesce(p_payload,'{}'::jsonb));
end;
$$;

revoke all on function public.queue_notification(text,text,text,text,jsonb) from public;

create or replace function public.queue_profile_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and lower(new.email) <> 'jpinnovation.enquiries@gmail.com' then
    perform public.queue_notification(
      'jpinnovation.enquiries@gmail.com','registration','New website registration',
      coalesce(nullif(new.full_name,''),new.email) || ' registered using ' || new.email,
      jsonb_build_object('user_id',new.user_id,'account_type',new.account_type,'membership_status',new.membership_status)
    );
  end if;
  if tg_op = 'UPDATE' and new.membership_status is distinct from old.membership_status then
    perform public.queue_notification(
      new.email,'membership-status','Your JP Innovation access has been updated',
      'Your account status is now ' || new.membership_status || '.',
      jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_queue_notifications on public.profiles;
create trigger profiles_queue_notifications
after insert or update of membership_status on public.profiles
for each row execute function public.queue_profile_notifications();

create or replace function public.queue_board_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare author_email text;
begin
  select email into author_email from public.profiles where user_id = new.author_id;
  if tg_op = 'INSERT' then
    perform public.queue_notification(
      'jpinnovation.enquiries@gmail.com','post-submitted','New Hub post awaiting approval',
      new.author_name || ' submitted: ' || new.title,
      jsonb_build_object('post_id',new.id,'category',new.category)
    );
  elsif new.moderation_status is distinct from old.moderation_status then
    perform public.queue_notification(
      author_email,'post-moderated','Your Innovation Hub post has been reviewed',
      'Your post "' || new.title || '" is now ' || new.moderation_status || '.',
      jsonb_build_object('post_id',new.id,'moderation_status',new.moderation_status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists board_posts_queue_notifications on public.board_posts;
create trigger board_posts_queue_notifications
after insert or update of moderation_status on public.board_posts
for each row execute function public.queue_board_notifications();

create or replace function public.queue_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recipient_email text;
begin
  select email into recipient_email from public.profiles where user_id = new.recipient_id;
  perform public.queue_notification(
    recipient_email,'new-message','New JP Innovation message',
    'You have a new private message: ' || new.subject,
    jsonb_build_object('message_id',new.id,'sender_name',new.sender_name)
  );
  return new;
end;
$$;

drop trigger if exists hub_messages_queue_notification on public.hub_messages;
create trigger hub_messages_queue_notification
after insert on public.hub_messages
for each row execute function public.queue_message_notification();

grant select, update on public.notification_outbox to authenticated;
