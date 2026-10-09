-- 0008: launch mode.
--   * VIP program behind a switch (off for launch; all VIP code and data stay).
--   * 20 swipes per 24 hours (VIP, when enabled, is unlimited); 1 Super Like a day.
--   * Indonesia only for now.
--   * Asystole only before the first message (24 h); after that, 30 days of silence.
--
-- To turn VIP back on later:   update public.app_config set value = 'true' where key = 'vip_enabled';
-- To open more countries:      update public.app_config set value = '["ID","MY","SG"]' where key = 'active_countries';

-- ---------------------------------------------------------------------
-- 1. Feature switches
-- ---------------------------------------------------------------------
create table if not exists public.app_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_config enable row level security;
-- No policies: read through get_app_flags(), change from the SQL editor / dashboard.

insert into public.app_config (key, value) values
  ('vip_enabled', 'false'),
  ('daily_swipe_limit', '20'),
  ('active_countries', '["ID"]')
on conflict (key) do nothing;

create or replace function public.vip_program_enabled()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select (value)::text::boolean from public.app_config where key = 'vip_enabled'), false) $$;

create or replace function public.daily_swipe_limit()
returns int
language sql stable security definer set search_path = ''
as $$ select coalesce((select (value)::text::int from public.app_config where key = 'daily_swipe_limit'), 20) $$;

create or replace function public.active_countries()
returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce((select array(select jsonb_array_elements_text(value)) from public.app_config where key = 'active_countries'), array['ID'])
$$;

-- What the UI needs to render the right mode. Safe for anonymous visitors (sign-up page).
create or replace function public.get_app_flags()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'vip_enabled', public.vip_program_enabled(),
    'daily_swipe_limit', public.daily_swipe_limit(),
    'active_countries', to_jsonb(public.active_countries()))
$$;

-- With the program off nobody gets VIP perks, whatever their subscription says.
create or replace function public.vip_active(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.vip_program_enabled() and exists (
    select 1 from public.subscriptions s
    where s.profile_id = p_profile and public.subscription_period_end(s) > now()
  )
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
  if not public.vip_program_enabled() then raise exception 'vip_disabled'; end if;
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  if p_plan not in ('monthly', 'quarterly', 'annual') then raise exception 'bad_plan'; end if;
  if public.vip_active(v_me.id) then raise exception 'already_subscribed'; end if;
  select currency, amount into v_currency, v_amount from public.plan_price(v_me.country, p_plan);
  insert into public.subscriptions (profile_id, plan, currency, amount, started_at, current_period_end)
  values (v_me.id, p_plan, v_currency, v_amount, now(), now() + public.plan_interval(p_plan));
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Daily swipe limit. A separate log, so Rewind / "Readmit discharged"
--    (which delete swipe rows) can't refill the quota.
-- ---------------------------------------------------------------------
create table if not exists public.swipe_log (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists swipe_log_profile_idx on public.swipe_log (profile_id, created_at desc);
alter table public.swipe_log enable row level security;

create or replace function public.swipe_quota()
returns table (used int, quota int, next_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       recent as (
         select l.created_at from public.swipe_log l, me
         where l.profile_id = me.id and l.created_at > now() - interval '24 hours'
       )
  select (select count(*) from recent)::int,
         case when public.vip_active((select id from me)) then null else public.daily_swipe_limit() end,
         (select min(created_at) + interval '24 hours' from recent)
$$;

create or replace function public.swipe_profile(p_target uuid, p_direction text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_me      public.profiles;
  v_target  public.profiles;
  v_match   uuid;
  v_liked_back boolean;
  v_used    int;
  v_quota   int;
begin
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  if p_direction not in ('left', 'right', 'super') then raise exception 'bad_direction'; end if;

  select * into v_target from public.profiles where id = p_target;
  if v_target.id is null or v_target.id = v_me.id then raise exception 'bad_target'; end if;
  if public.is_blocked_pair(v_me.id, v_target.id) then raise exception 'blocked'; end if;

  select used, quota into v_used, v_quota from public.swipe_quota();
  if v_quota is not null and v_used >= v_quota then raise exception 'swipe_limit'; end if;

  if p_direction = 'super' then
    if exists (select 1 from public.swipes where swiper_id = v_me.id and target_id = v_target.id and direction = 'super') then
      raise exception 'already_superliked';
    end if;
    select used, quota into v_used, v_quota from public.superlike_quota();
    if v_used >= v_quota then raise exception 'superlike_limit'; end if;
  end if;

  insert into public.swipes (swiper_id, target_id, direction)
  values (v_me.id, v_target.id, p_direction)
  on conflict (swiper_id, target_id) do update set direction = excluded.direction, created_at = now();
  insert into public.swipe_log (profile_id) values (v_me.id);

  if p_direction = 'left' then return jsonb_build_object('matched', false); end if;

  v_liked_back := v_target.is_bot or exists (
    select 1 from public.swipes
    where swiper_id = v_target.id and target_id = v_me.id and direction in ('right', 'super'));
  if not v_liked_back then return jsonb_build_object('matched', false, 'super', p_direction = 'super'); end if;

  insert into public.matches (profile_a, profile_b)
  values (least(v_me.id, v_target.id), greatest(v_me.id, v_target.id))
  on conflict (profile_a, profile_b) do nothing
  returning id into v_match;

  if v_match is null then
    select id into v_match from public.matches
    where profile_a = least(v_me.id, v_target.id) and profile_b = greatest(v_me.id, v_target.id);
  elsif v_target.is_bot and v_target.opener is not null
        and not (v_target.gender = 'male' and v_me.gender = 'female') then
    insert into public.messages (match_id, sender_id, body) values (v_match, v_target.id, v_target.opener);
  end if;

  return jsonb_build_object('matched', true, 'match_id', v_match, 'super', p_direction = 'super');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Asystole only before the first message; dormant consults after 30 days
-- ---------------------------------------------------------------------
create or replace function public.consult_expires_at(p_match public.matches)
returns timestamptz
language sql stable set search_path = ''
as $$
  select case when p_match.bubble_count = 0
              then p_match.created_at + interval '24 hours'
              else coalesce(p_match.last_activity_at, p_match.created_at) + interval '30 days' end
$$;

create or replace function public.consult_flatlined(p_match public.matches)
returns boolean
language sql stable set search_path = ''
as $$ select public.consult_expires_at(p_match) < now() $$;

create or replace function public.purge_stale_consults()
returns int
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  -- Asystole (nobody ever wrote): delete and clear the pair's swipes for a second chance.
  with dead as (
    delete from public.matches m
    where m.bubble_count = 0 and m.created_at < now() - interval '24 hours'
    returning m.profile_a, m.profile_b
  ), cleared as (
    delete from public.swipes s using dead d
    where (s.swiper_id = d.profile_a and s.target_id = d.profile_b)
       or (s.swiper_id = d.profile_b and s.target_id = d.profile_a)
  )
  select count(*) into n from dead;

  -- Dormant (talked, then 30 days of silence): just remove the room.
  with dormant as (
    delete from public.matches m
    where m.bubble_count > 0 and coalesce(m.last_activity_at, m.created_at) < now() - interval '30 days'
    returning 1
  )
  select n + count(*) into n from dormant;
  return n;
end;
$$;

-- Messages: same rules as 0007, bubble cap only while the VIP program is on.
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
  select * into v_match from public.matches where id = new.match_id;
  if v_match.id is null or public.consult_flatlined(v_match) then
    raise exception 'consult_expired';
  end if;

  if v_sender.is_bot then
    new.image_path := null;
    return new;
  end if;

  select * into v_other from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if v_sender.deactivated_at is not null or v_other.deactivated_at is not null then
    raise exception 'account_paused';
  end if;
  if public.is_blocked_pair(v_sender.id, v_other.id) then raise exception 'blocked'; end if;
  if new.image_path is not null and new.image_path not like new.match_id::text || '/%' then
    raise exception 'bad_image';
  end if;
  if v_match.bubble_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
    raise exception 'bumble_wait' using hint = 'The female doctor makes the first incision.';
  end if;
  if public.vip_program_enabled() and v_match.bubble_count >= 10 and not public.vip_active(v_sender.id) then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := public.mask_contact_info(btrim(new.body));
  new.created_at := now();
  return new;
end;
$$;

drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, other_verified boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select m.id, m.created_at,
         o.id, o.display_name, o.gender, o.photo_url, o.photo_fallback_url,
         o.specialty_title, o.hospital, public.distance_to(o.id), o.is_bot,
         o.identity_verified and o.doctor_verified,
         lm.body, lm.image_path is not null, lm.created_at, lm.sender_id,
         m.bubble_count,
         public.consult_expires_at(m)
  from public.matches m
  cross join me
  join public.profiles o on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where me.id in (m.profile_a, m.profile_b)
    and not public.is_blocked_pair(me.id, o.id)
    and not public.consult_flatlined(m)
    and o.deactivated_at is null
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- ---------------------------------------------------------------------
-- 4. Indonesia only: the deck never serves an inactive country
-- ---------------------------------------------------------------------
drop function if exists public.get_candidates(text);
create function public.get_candidates(p_country text default null)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       ml as (select l.lat, l.lng from public.locations l, me where l.profile_id = me.id),
       cc as (
         select case
           when coalesce(p_country, (select country from public.profiles where id = (select id from me))) = any (public.active_countries())
             then coalesce(p_country, (select country from public.profiles where id = (select id from me)))
           else (public.active_countries())[1] end as code
       )
  select (to_jsonb(p) - 'replies' - 'opener' - 'user_id' - 'base_city' - 'deactivated_at')
         || jsonb_build_object(
              'distance_km', (select public.km_between(ml.lat, ml.lng, l.lat, l.lng) from ml, public.locations l where l.profile_id = p.id),
              'superliked_me', exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super'))
  from public.profiles p, me, cc
  where p.id <> me.id
    and p.deactivated_at is null
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = p.id)
    and not public.is_blocked_pair(me.id, p.id)
    and p.country = cc.code
  order by exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super') desc,
           p.is_featured desc, md5(p.id::text || me.id::text)
$$;

-- ---------------------------------------------------------------------
-- 5. Permissions
-- ---------------------------------------------------------------------
revoke all on function public.vip_program_enabled(), public.daily_swipe_limit(), public.active_countries(),
  public.swipe_quota(), public.swipe_profile(uuid, text), public.subscribe_vip_demo(text), public.get_inbox(),
  public.get_candidates(text), public.consult_expires_at(public.matches), public.consult_flatlined(public.matches),
  public.purge_stale_consults(), public.get_app_flags() from public, anon;
grant execute on function public.get_app_flags() to anon, authenticated;
grant execute on function public.swipe_quota(), public.swipe_profile(uuid, text), public.subscribe_vip_demo(text),
  public.get_inbox(), public.get_candidates(text), public.consult_expires_at(public.matches),
  public.consult_flatlined(public.matches) to authenticated;

notify pgrst, 'reload schema';
