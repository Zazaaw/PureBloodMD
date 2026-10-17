-- 0026: web push notifications for new matches and new messages.
--   * push_subscriptions: one row per browser/phone that allowed notifications.
--   * send_push(): hands the subscriptions + payload to the `push` Edge Function
--     (supabase/functions/push), which signs and sends them with the VAPID key.
--     URL in app_config.push_url, shared secret in Vault (push_webhook_secret);
--     both are set by `npm run supabase:push -- push`.
--   * Triggers: a new message notifies the other doctor; a new match notifies the
--     doctor who did not just swipe (the swiper is already looking at the app).
--   Never blocks a message or a match: any failure is swallowed.

create table if not exists public.push_subscriptions (
  endpoint     text primary key check (endpoint like 'https://%' and char_length(endpoint) < 1000),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  p256dh       text not null check (char_length(p256dh) < 200),
  auth         text not null check (char_length(auth) < 100),
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "read own push subscriptions" on public.push_subscriptions;
create policy "read own push subscriptions" on public.push_subscriptions for select to authenticated
  using (profile_id = public.my_profile_id());

-- Same device, new account: the endpoint moves to whoever is signed in now.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  insert into public.push_subscriptions (endpoint, profile_id, p256dh, auth, user_agent)
  values (p_endpoint, v_me, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_used_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and profile_id = public.my_profile_id();
$$;

revoke all on function public.save_push_subscription(text, text, text, text), public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text), public.delete_push_subscription(text) to authenticated;

create or replace function public.send_push(p_profile uuid, p_payload jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_subs   jsonb;
  v_url    text;
  v_secret text;
begin
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
    into v_subs from public.push_subscriptions where profile_id = p_profile;
  if v_subs is null then return; end if;
  select value #>> '{}' into v_url from public.app_config where key = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('subs', v_subs, 'payload', p_payload)
  );
exception when others then
  raise warning 'push not sent: %', sqlerrm;
end;
$$;
revoke all on function public.send_push(uuid, jsonb) from public, anon, authenticated;

create or replace function public.notify_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_match  public.matches;
  v_sender public.profiles;
  v_to     public.profiles;
  v_body   text;
begin
  select * into v_match from public.matches where id = new.match_id;
  select * into v_sender from public.profiles where id = new.sender_id;
  select * into v_to from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;
  if v_to.id is null or v_to.is_bot or v_to.deactivated_at is not null or v_to.banned_at is not null then return null; end if;

  v_body := case
    when new.image_path is not null then '📷 Photo' || coalesce(': ' || nullif(new.body, ''), '')
    when new.body ~ '^::sticker:[a-z-]+::$' then 'Sent you a sticker'
    else left(new.body, 120)
  end;
  perform public.send_push(v_to.id, jsonb_build_object(
    'title', v_sender.display_name,
    'body', v_body,
    'url', '/chat/' || new.match_id,
    'tag', 'chat-' || new.match_id));
  return null;
exception when others then
  return null;
end;
$$;

drop trigger if exists messages_notify_push on public.messages;
create trigger messages_notify_push after insert on public.messages
  for each row execute function public.notify_message();

create or replace function public.notify_match()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := public.my_profile_id();
  v_to    public.profiles;
  v_other public.profiles;
begin
  for v_to in select * from public.profiles where id in (new.profile_a, new.profile_b) loop
    continue when v_to.id = v_actor or v_to.is_bot or v_to.deactivated_at is not null or v_to.banned_at is not null;
    select * into v_other from public.profiles
      where id = case when v_to.id = new.profile_a then new.profile_b else new.profile_a end;
    perform public.send_push(v_to.id, jsonb_build_object(
      'title', case when v_to.intent = 'connect' then 'New colleague connected 🤝' else 'It''s a match! 💘' end,
      'body', 'You and ' || v_other.display_name || ' matched. Say hi within 24 hours.',
      'url', '/chat/' || new.id,
      'tag', 'match-' || new.id));
  end loop;
  return null;
exception when others then
  return null;
end;
$$;

drop trigger if exists matches_notify_push on public.matches;
create trigger matches_notify_push after insert on public.matches
  for each row execute function public.notify_match();

notify pgrst, 'reload schema';
