-- =====================================================================
-- PureBloodMD 0004: VIP plans + cancel subscription, unmatch, delete chat,
-- auto-delete consults after 30 days of silence, bots in every country.
-- Run in the Supabase SQL Editor after 0001-0003. Safe to re-run.
-- Demo only: no real payment is taken anywhere.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bots outside Indonesia: base_city is free text now
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_base_city_check;

-- ---------------------------------------------------------------------
-- 2. Subscriptions (replace the on/off VIP switch)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references public.profiles (id) on delete cascade,
  plan                  text not null check (plan in ('monthly', 'quarterly', 'annual')),
  currency              text not null check (currency in ('IDR', 'USD')),
  amount                numeric(12, 2) not null check (amount > 0),
  started_at            timestamptz not null default now(),
  current_period_end    timestamptz not null,
  cancel_at_period_end  boolean not null default false,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists subscriptions_profile_idx on public.subscriptions (profile_id, created_at desc);
alter table public.subscriptions enable row level security;
drop policy if exists "read own subscriptions" on public.subscriptions;
create policy "read own subscriptions" on public.subscriptions for select to authenticated
  using (profile_id = public.my_profile_id());

create or replace function public.plan_interval(p_plan text)
returns interval
language sql immutable set search_path = ''
as $$
  select case p_plan when 'monthly' then interval '1 month'
                     when 'quarterly' then interval '3 months'
                     when 'annual' then interval '1 year' end
$$;

-- Indonesia pays in rupiah; everywhere else in USD.
create or replace function public.plan_price(p_country text, p_plan text)
returns table (currency text, amount numeric)
language sql immutable set search_path = ''
as $$
  select case when p_country = 'ID' then 'IDR' else 'USD' end,
         case when p_country = 'ID'
              then case p_plan when 'monthly' then 50000 when 'quarterly' then 130000 when 'annual' then 550000 end
              else case p_plan when 'monthly' then 20 when 'quarterly' then 50 when 'annual' then 230 end
         end::numeric
$$;

-- Period end right now: renewing plans roll forward (demo: renewal always succeeds),
-- cancelled plans stop at the end of the period they were cancelled in.
create or replace function public.subscription_period_end(s public.subscriptions)
returns timestamptz
language plpgsql stable set search_path = ''
as $$
declare e timestamptz := s.current_period_end;
begin
  if s.cancel_at_period_end then return e; end if;
  while e <= now() loop
    e := e + public.plan_interval(s.plan);
  end loop;
  return e;
end;
$$;

create or replace function public.vip_active(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.profile_id = p_profile and public.subscription_period_end(s) > now()
  )
$$;

create or replace function public.get_my_subscription()
returns table (id uuid, plan text, currency text, amount numeric, started_at timestamptz,
               period_end timestamptz, cancel_at_period_end boolean, active boolean)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.plan, s.currency, s.amount, s.started_at,
         public.subscription_period_end(s), s.cancel_at_period_end,
         public.subscription_period_end(s) > now()
  from public.subscriptions s
  where s.profile_id = public.my_profile_id()
  order by s.created_at desc
  limit 1
$$;

create or replace function public.subscribe_vip_demo(p_plan text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me public.profiles;
  v_currency text;
  v_amount numeric;
begin
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  if p_plan not in ('monthly', 'quarterly', 'annual') then raise exception 'bad_plan'; end if;
  if public.vip_active(v_me.id) then raise exception 'already_subscribed'; end if;
  select currency, amount into v_currency, v_amount from public.plan_price(v_me.country, p_plan);
  insert into public.subscriptions (profile_id, plan, currency, amount, started_at, current_period_end)
  values (v_me.id, p_plan, v_currency, v_amount, now(), now() + public.plan_interval(p_plan));
end;
$$;

-- VIP stays on until the end of the paid period, then turns off.
create or replace function public.cancel_subscription()
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions; v_end timestamptz;
begin
  select * into s from public.subscriptions
  where profile_id = public.my_profile_id() order by created_at desc limit 1;
  if s.id is null or public.subscription_period_end(s) <= now() then raise exception 'no_active_subscription'; end if;
  v_end := public.subscription_period_end(s);
  update public.subscriptions
  set cancel_at_period_end = true, canceled_at = now(), current_period_end = v_end
  where id = s.id;
  return v_end;
end;
$$;

create or replace function public.resume_subscription()
returns void
language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions
  where profile_id = public.my_profile_id() order by created_at desc limit 1;
  if s.id is null or not s.cancel_at_period_end or s.current_period_end <= now() then
    raise exception 'nothing_to_resume';
  end if;
  update public.subscriptions set cancel_at_period_end = false, canceled_at = null where id = s.id;
end;
$$;

-- Carry over anyone who flipped the old demo switch on: one monthly period from today.
insert into public.subscriptions (profile_id, plan, currency, amount, current_period_end)
select p.id, 'monthly', pp.currency, pp.amount, now() + interval '1 month'
from public.profiles p, public.plan_price(coalesce(p.country, 'ID'), 'monthly') pp
where p.is_vip and not p.is_bot
  and not exists (select 1 from public.subscriptions s where s.profile_id = p.id);

-- The old switch is gone.
drop function if exists public.activate_vip_demo();
drop function if exists public.deactivate_vip_demo();

-- ---------------------------------------------------------------------
-- 3. Per-match counters: quota survives "delete chat", activity drives expiry
-- ---------------------------------------------------------------------
alter table public.matches add column if not exists bubble_count int not null default 0;
alter table public.matches add column if not exists last_activity_at timestamptz;

update public.matches m set
  bubble_count = coalesce((select count(*) from public.messages x where x.match_id = m.id), 0),
  last_activity_at = coalesce((select max(created_at) from public.messages x where x.match_id = m.id), m.created_at)
where m.last_activity_at is null;

alter table public.matches alter column last_activity_at set default now();

create or replace function public.touch_match()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.matches
  set bubble_count = bubble_count + 1, last_activity_at = greatest(coalesce(last_activity_at, new.created_at), new.created_at)
  where id = new.match_id;
  return null;
end;
$$;

drop trigger if exists messages_touch_match on public.messages;
create trigger messages_touch_match after insert on public.messages
  for each row execute function public.touch_match();

create or replace function public.enforce_message_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sender  public.profiles;
  v_other   public.profiles;
  v_match   public.matches;
begin
  select * into v_sender from public.profiles where id = new.sender_id;
  if v_sender.is_bot then
    new.image_path := null;
    return new;
  end if;

  select * into v_match from public.matches where id = new.match_id;
  select * into v_other from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if public.is_blocked_pair(v_sender.id, v_other.id) then raise exception 'blocked'; end if;

  if new.image_path is not null and new.image_path not like new.match_id::text || '/%' then
    raise exception 'bad_image';
  end if;

  -- Counted on the match, so deleting the chat history does not reset either rule.
  if v_match.bubble_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
    raise exception 'bumble_wait' using hint = 'The female doctor makes the first incision.';
  end if;

  if v_match.bubble_count >= 10 and not public.vip_active(v_sender.id) then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Unmatch, delete chat, auto-expiry. Photos of deleted messages are
--    queued in media_trash and removed from Storage by `npm run db:cleanup`
--    (Storage files can only be deleted through the Storage API).
-- ---------------------------------------------------------------------
create table if not exists public.media_trash (
  path        text primary key,
  queued_at   timestamptz not null default now()
);
alter table public.media_trash enable row level security;  -- no policies: service role only

create or replace function public.trash_message_media()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.image_path is not null then
    insert into public.media_trash (path) values (old.image_path) on conflict do nothing;
  end if;
  return null;
end;
$$;

drop trigger if exists messages_trash_media on public.messages;
create trigger messages_trash_media after delete on public.messages
  for each row execute function public.trash_message_media();

-- Unmatch: the consult and every message disappear for both doctors.
-- The swipes stay, so you do not get shown to each other again.
create or replace function public.unmatch_consult(p_match uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_match_member(p_match) then raise exception 'not_member'; end if;
  delete from public.matches where id = p_match;
end;
$$;

-- Delete chat: clears the history for both doctors, keeps the match.
create or replace function public.clear_chat(p_match uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  if not public.is_match_member(p_match) then raise exception 'not_member'; end if;
  delete from public.messages where match_id = p_match;
  get diagnostics n = row_count;
  update public.matches set last_activity_at = now() where id = p_match;
  return n;
end;
$$;

-- Consults with no message for 30 days are removed (keeps the database lean).
create or replace function public.purge_stale_consults()
returns int
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  delete from public.matches
  where coalesce(last_activity_at, created_at) < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Hourly purge with pg_cron (built into Supabase).
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'purebloodmd-purge-stale-consults';
select cron.schedule('purebloodmd-purge-stale-consults', '17 * * * *', 'select public.purge_stale_consults()');

-- Stream match updates/deletes so the other doctor sees "chat cleared" / "unmatched" live.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Inbox with counters + expiry date
-- ---------------------------------------------------------------------
drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select m.id, m.created_at,
         o.id, o.display_name, o.gender, o.photo_url, o.photo_fallback_url,
         o.specialty_title, o.hospital, public.distance_to(o.id), o.is_bot,
         lm.body, lm.image_path is not null, lm.created_at, lm.sender_id,
         m.bubble_count,
         coalesce(m.last_activity_at, m.created_at) + interval '30 days'
  from public.matches m
  cross join me
  join public.profiles o on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where me.id in (m.profile_a, m.profile_b)
    and not public.is_blocked_pair(me.id, o.id)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- ---------------------------------------------------------------------
-- 6. Permissions
-- ---------------------------------------------------------------------
revoke all on function public.get_my_subscription(), public.subscribe_vip_demo(text), public.cancel_subscription(),
  public.resume_subscription(), public.unmatch_consult(uuid), public.clear_chat(uuid), public.get_inbox(),
  public.vip_active(uuid), public.purge_stale_consults()
  from public, anon;
grant execute on function public.get_my_subscription(), public.subscribe_vip_demo(text), public.cancel_subscription(),
  public.resume_subscription(), public.unmatch_consult(uuid), public.clear_chat(uuid), public.get_inbox()
  to authenticated;

notify pgrst, 'reload schema';
