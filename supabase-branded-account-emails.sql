-- Branded account email content for the existing notification outbox.
-- The outbox delivery function should send html_body when it is present.

alter table public.notification_outbox
  add column if not exists html_body text;

create or replace function public.jp_email_html(
  p_heading text,
  p_greeting text,
  p_message text
)
returns text
language sql
immutable
as $$
  select '<!doctype html><html><body style="margin:0;background:#05080d;color:#f4f7fb;font-family:Arial,sans-serif">'
    || '<div style="max-width:600px;margin:0 auto;padding:28px 18px">'
    || '<div style="border:1px solid #1d3859;border-radius:14px;background:#0a121d;padding:28px">'
    || '<div style="height:3px;background:#1688ff;border-radius:3px;margin-bottom:24px"></div>'
    || '<h1 style="font-size:24px;line-height:1.25;margin:0 0 20px;color:#ffffff">' || coalesce(p_heading, '') || '</h1>'
    || '<p style="font-size:16px;line-height:1.6;color:#d8e1ed">' || coalesce(p_greeting, 'Hello,') || '</p>'
    || '<p style="font-size:16px;line-height:1.6;color:#b8c5d6">' || coalesce(p_message, '') || '</p>'
    || '<p style="font-size:15px;line-height:1.6;color:#d8e1ed;margin-top:26px">Kind regards,<br><strong>Jon Hotard</strong><br>JP Innovation Ltd</p>'
    || '<div style="border-top:1px solid #1d3859;margin-top:24px;padding-top:20px;text-align:center">'
    || '<img src="https://www.jpinnovation.co.uk/assets/jp-innovation-logo.png" width="280" style="max-width:100%;height:auto" alt="JP Innovation Ltd">'
    || '</div></div></div></body></html>';
$$;

create or replace function public.queue_branded_notification(
  p_recipient text,
  p_event_type text,
  p_subject text,
  p_body text,
  p_heading text,
  p_greeting text,
  p_message text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_recipient), '') is null then return; end if;
  insert into public.notification_outbox(recipient_email,event_type,subject,body,html_body,payload)
  values(
    lower(trim(p_recipient)), p_event_type, p_subject, p_body,
    public.jp_email_html(p_heading,p_greeting,p_message), coalesce(p_payload,'{}'::jsonb)
  );
end;
$$;

revoke all on function public.queue_branded_notification(text,text,text,text,text,text,text,jsonb) from public;

create or replace function public.queue_profile_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_name text;
  requested_access text;
  recent_event boolean;
begin
  first_name := split_part(coalesce(nullif(trim(new.full_name),''),'there'), ' ', 1);
  select coalesce(raw_user_meta_data->>'requested_access','client')
    into requested_access from auth.users where id = new.user_id;

  if tg_op = 'INSERT' and lower(new.email) <> 'jpinnovation.enquiries@gmail.com' then
    perform public.queue_notification(
      'jpinnovation.enquiries@gmail.com','registration','New website registration',
      coalesce(nullif(new.full_name,''),new.email) || ' registered using ' || new.email,
      jsonb_build_object('user_id',new.user_id,'account_type',new.account_type,'membership_status',new.membership_status,'requested_access',requested_access)
    );

    if requested_access = 'hub' then
      perform public.queue_branded_notification(
        new.email,'hub-registration-received','We have received your Innovation Hub request',
        'Thank you for registering your interest in the JP Innovation Hub. Your request has been received and will be reviewed shortly.',
        'Registration request received','Hello ' || first_name || ',',
        'Thank you for registering your interest in the JP Innovation Hub. Your request has been received and will be reviewed shortly. We will email you again as soon as your access has been approved.',
        jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
      );
    else
      perform public.queue_branded_notification(
        new.email,'client-registration-received','Welcome to the JP Innovation Client Portal',
        'Your Client Portal account has been created. You can use it for private quotes, project updates and messages with JP Innovation.',
        'Your Client Portal account','Hello ' || first_name || ',',
        'Thank you for registering. Your Client Portal account is ready for private quote requests, project updates and direct messages with JP Innovation.',
        jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
      );
    end if;
  end if;

  if tg_op = 'UPDATE' and new.membership_status is distinct from old.membership_status then
    select exists(
      select 1 from public.notification_outbox
      where payload->>'user_id' = new.user_id::text
        and event_type = case when new.membership_status = 'pending' then 'hub-registration-received' else 'hub-access-' || new.membership_status end
        and created_at > now() - interval '24 hours'
    ) into recent_event;

    if not recent_event then
      if new.membership_status = 'pending' then
        perform public.queue_branded_notification(
          new.email,'hub-registration-received','We have received your Innovation Hub request',
          'Your request has been received and will be reviewed shortly.',
          'Registration request received','Hello ' || first_name || ',',
          'Thank you for registering your interest in the JP Innovation Hub. Your request has been received and will be reviewed shortly. We will email you again as soon as your access has been approved.',
          jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
        );
      elsif new.membership_status = 'active' and new.account_type = 'member' then
        perform public.queue_branded_notification(
          new.email,'hub-access-active','Your Innovation Hub access is approved',
          'Your JP Innovation Hub membership has been approved. You can now sign in and use the member workspace.',
          'Welcome to the Innovation Hub','Hello ' || first_name || ',',
          'Your membership has been approved. Sign in with your existing account to use the Engineering Boards, member tools and your private client work in one workspace.',
          jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
        );
      elsif new.membership_status in ('rejected','suspended') then
        perform public.queue_branded_notification(
          new.email,'hub-access-' || new.membership_status,'An update to your Innovation Hub access',
          'There has been an update to your Innovation Hub access. Your Client Portal data remains available.',
          'Account access update','Hello ' || first_name || ',',
          'There has been an update to your Innovation Hub access. Your private quotes, projects and messages remain safely available through your Client Portal account. Please reply to this email if you would like to discuss it.',
          jsonb_build_object('user_id',new.user_id,'membership_status',new.membership_status)
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_queue_notifications on public.profiles;
create trigger profiles_queue_notifications
after insert or update of membership_status on public.profiles
for each row execute function public.queue_profile_notifications();
