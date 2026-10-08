-- =====================================================================
-- PureBloodMD 0003: photos in chat, block & report, GP + Medical Student,
-- country + radar (device location) instead of city dropdowns.
-- Run in the Supabase SQL Editor after 0001 and 0002. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New specialties + country
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_specialty_check;
alter table public.profiles add constraint profiles_specialty_check check (specialty in (
  'Cardiology', 'Surgery', 'OBGYN', 'Orthopedics', 'Psychiatry', 'Neurosurgery', 'Neurology',
  'Anesthesiology', 'Dermatology', 'Radiology', 'Ophthalmology', 'PlasticSurgery', 'Pediatrics',
  'Pulmonology', 'GeneralPractitioner', 'MedicalStudent'));

alter table public.profiles add column if not exists country text not null default 'ID';
alter table public.profiles drop constraint if exists profiles_country_check;
alter table public.profiles add constraint profiles_country_check check (country ~ '^[A-Z]{2}$');

-- City is no longer asked; bots keep it only to place them on the map.
alter table public.profiles alter column base_city drop not null;

grant update (country) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. Radar: private, coarse locations. Nobody can read anyone else's
--    coordinates; the app only ever receives a computed distance.
-- ---------------------------------------------------------------------
create table if not exists public.locations (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  updated_at  timestamptz not null default now()
);
alter table public.locations enable row level security;

drop policy if exists "read own location" on public.locations;
create policy "read own location" on public.locations for select to authenticated
  using (profile_id = public.my_profile_id());

create or replace function public.km_between(a_lat float8, a_lng float8, b_lat float8, b_lng float8)
returns numeric
language sql immutable set search_path = ''
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2) +
    cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)
  )))::numeric, 1)
$$;

-- Rounded to 2 decimals (about 1 km) before it is stored.
create or replace function public.set_my_location(p_lat float8, p_lng float8)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'bad_location'; end if;
  insert into public.locations (profile_id, lat, lng, updated_at)
  values (v_me, round(p_lat::numeric, 2), round(p_lng::numeric, 2), now())
  on conflict (profile_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
end;
$$;

create or replace function public.has_my_location()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.locations where profile_id = public.my_profile_id())
$$;

-- Bots get a spot near their old city center at their old distance.
create or replace function public.place_bot()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_lat float8; c_lng float8; theta float8; d float8;
begin
  if not new.is_bot or new.base_city is null then return new; end if;
  select x.lat, x.lng into c_lat, c_lng from (values
    ('Jaksel', -6.2615, 106.8106), ('Jakpus', -6.1865, 106.8341), ('Jakbar', -6.1683, 106.7589),
    ('Tangsel', -6.2886, 106.7179), ('Depok', -6.4025, 106.7942), ('Bandung', -6.9175, 107.6191),
    ('Surabaya', -7.2575, 112.7521)) as x(city, lat, lng)
  where x.city = new.base_city;
  if c_lat is null then return new; end if;
  theta := radians(abs(hashtext(new.id::text)) % 360);
  d := coalesce(new.distance_km, 5);
  insert into public.locations (profile_id, lat, lng)
  values (new.id, c_lat + (d / 111.0) * cos(theta), c_lng + (d / (111.0 * cos(radians(c_lat)))) * sin(theta))
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_place_bot on public.profiles;
create trigger profiles_place_bot after insert on public.profiles
  for each row execute function public.place_bot();

-- Place the bots that already exist.
insert into public.locations (profile_id, lat, lng)
select p.id,
       c.lat + (coalesce(p.distance_km, 5) / 111.0) * cos(radians(abs(hashtext(p.id::text)) % 360)),
       c.lng + (coalesce(p.distance_km, 5) / (111.0 * cos(radians(c.lat)))) * sin(radians(abs(hashtext(p.id::text)) % 360))
from public.profiles p
join (values
    ('Jaksel', -6.2615, 106.8106), ('Jakpus', -6.1865, 106.8341), ('Jakbar', -6.1683, 106.7589),
    ('Tangsel', -6.2886, 106.7179), ('Depok', -6.4025, 106.7942), ('Bandung', -6.9175, 107.6191),
    ('Surabaya', -7.2575, 112.7521)) as c(city, lat, lng) on c.city = p.base_city
where p.is_bot
on conflict (profile_id) do nothing;

create or replace function public.distance_to(p_other uuid)
returns numeric
language sql stable security definer set search_path = ''
as $$
  select public.km_between(a.lat, a.lng, b.lat, b.lng)
  from public.locations a, public.locations b
  where a.profile_id = public.my_profile_id() and b.profile_id = p_other
$$;

-- ---------------------------------------------------------------------
-- 3. Block & report
-- ---------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks for select to authenticated
  using (blocker_id = public.my_profile_id());

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reported_id  uuid not null references public.profiles (id) on delete cascade,
  match_id     uuid references public.matches (id) on delete set null,
  reason       text not null check (reason in (
                 'sexual_harassment', 'unsolicited_explicit_content', 'verbal_abuse', 'threats',
                 'hate_speech', 'fake_profile', 'scam_or_spam', 'underage', 'self_harm', 'other')),
  details      text not null default '' check (char_length(details) <= 1000),
  status       text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports for select to authenticated
  using (reporter_id = public.my_profile_id());

create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function public.block_profile(p_target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if p_target = v_me then raise exception 'bad_target'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_me, p_target) on conflict do nothing;
end;
$$;

create or replace function public.unblock_profile(p_target uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.blocks where blocker_id = public.my_profile_id() and blocked_id = p_target
$$;

create or replace function public.report_profile(
  p_target uuid, p_reason text, p_details text default '', p_match uuid default null, p_block boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if p_target = v_me then raise exception 'bad_target'; end if;
  if p_match is not null and not exists (
    select 1 from public.matches where id = p_match and v_me in (profile_a, profile_b) and p_target in (profile_a, profile_b)
  ) then
    raise exception 'bad_match';
  end if;
  if (select count(*) from public.reports where reporter_id = v_me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports';
  end if;
  insert into public.reports (reporter_id, reported_id, match_id, reason, details)
  values (v_me, p_target, p_match, p_reason, left(coalesce(btrim(p_details), ''), 1000));
  if p_block then
    insert into public.blocks (blocker_id, blocked_id) values (v_me, p_target) on conflict do nothing;
  end if;
end;
$$;

create or replace function public.get_blocked()
returns table (profile_id uuid, display_name text, photo_url text, photo_fallback_url text, specialty_title text, blocked_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.display_name, p.photo_url, p.photo_fallback_url, p.specialty_title, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = public.my_profile_id()
  order by b.created_at desc
$$;

-- ---------------------------------------------------------------------
-- 4. Photos in chat
-- ---------------------------------------------------------------------
alter table public.messages add column if not exists image_path text;
alter table public.messages add column if not exists image_width int check (image_width between 1 and 10000);
alter table public.messages add column if not exists image_height int check (image_height between 1 and 10000);
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_body_or_image;
alter table public.messages add constraint messages_body_or_image check (
  char_length(body) <= 1000 and (image_path is not null or char_length(btrim(body)) >= 1));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Files live at chat-media/<match_id>/<uuid>.<ext>; only the two doctors in the match can touch them.
create or replace function public.can_access_chat_media(p_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare v_match uuid; v_other uuid; v_me uuid := public.my_profile_id();
begin
  begin
    v_match := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  select case when profile_a = v_me then profile_b else profile_a end into v_other
  from public.matches where id = v_match and v_me in (profile_a, profile_b);
  return v_other is not null and not public.is_blocked_pair(v_me, v_other);
end;
$$;

drop policy if exists "chat media read" on storage.objects;
create policy "chat media read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-media' and public.can_access_chat_media(name));
drop policy if exists "chat media upload" on storage.objects;
create policy "chat media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and public.can_access_chat_media(name));

-- ---------------------------------------------------------------------
-- 5. Updated rules and RPCs
-- ---------------------------------------------------------------------
create or replace function public.enforce_message_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sender  public.profiles;
  v_other   public.profiles;
  v_match   public.matches;
  v_count   int;
begin
  select * into v_sender from public.profiles where id = new.sender_id;
  if v_sender.is_bot then
    new.image_path := null;
    return new;
  end if;

  select * into v_match from public.matches where id = new.match_id;
  select * into v_other from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if public.is_blocked_pair(v_sender.id, v_other.id) then
    raise exception 'blocked';
  end if;

  if new.image_path is not null and new.image_path not like new.match_id::text || '/%' then
    raise exception 'bad_image';
  end if;

  select count(*) into v_count from public.messages where match_id = new.match_id;

  if v_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
    raise exception 'bumble_wait' using hint = 'The female doctor makes the first incision.';
  end if;

  if v_count >= 10 and not v_sender.is_vip then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.bot_auto_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_match  public.matches;
  v_bot    public.profiles;
  v_photo_jokes text[] := array[
    'Radiology read: image received. Impression: unremarkable, except you look great 🩻',
    'Saving this to my portfolio of favorite clinical images 📸',
    'Photo reviewed. No acute findings, just acute attraction 😳',
    'Is this a candid or did you hire a hospital photographer? 😄'
  ];
begin
  select * into v_match from public.matches where id = new.match_id;
  select * into v_bot from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if v_bot.is_bot and new.sender_id <> v_bot.id and cardinality(v_bot.replies) > 0 then
    insert into public.messages (match_id, sender_id, body, created_at)
    values (new.match_id, v_bot.id,
            case when new.image_path is not null
                 then v_photo_jokes[1 + floor(random() * cardinality(v_photo_jokes))::int]
                 else v_bot.replies[1 + floor(random() * cardinality(v_bot.replies))::int] end,
            now() + interval '1 second');
  end if;
  return null;
end;
$$;

drop function if exists public.get_candidates();
create function public.get_candidates()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       ml as (select l.lat, l.lng from public.locations l, me where l.profile_id = me.id)
  select (to_jsonb(p) - 'replies' - 'opener' - 'user_id' - 'base_city')
         || jsonb_build_object('distance_km',
              (select public.km_between(ml.lat, ml.lng, l.lat, l.lng) from ml, public.locations l where l.profile_id = p.id))
  from public.profiles p, me
  where p.id <> me.id
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = p.id)
    and not public.is_blocked_pair(me.id, p.id)
  order by p.is_featured desc, md5(p.id::text || me.id::text)
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
begin
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  if p_direction not in ('left', 'right', 'super') then raise exception 'bad_direction'; end if;

  select * into v_target from public.profiles where id = p_target;
  if v_target.id is null or v_target.id = v_me.id then raise exception 'bad_target'; end if;
  if public.is_blocked_pair(v_me.id, v_target.id) then raise exception 'blocked'; end if;

  insert into public.swipes (swiper_id, target_id, direction)
  values (v_me.id, v_target.id, p_direction)
  on conflict (swiper_id, target_id) do update set direction = excluded.direction, created_at = now();

  if p_direction = 'left' then return jsonb_build_object('matched', false); end if;

  v_liked_back := v_target.is_bot or exists (
    select 1 from public.swipes
    where swiper_id = v_target.id and target_id = v_me.id and direction in ('right', 'super'));
  if not v_liked_back then return jsonb_build_object('matched', false); end if;

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

  return jsonb_build_object('matched', true, 'match_id', v_match);
end;
$$;

drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select m.id, m.created_at,
         o.id, o.display_name, o.gender, o.photo_url, o.photo_fallback_url,
         o.specialty_title, o.hospital, public.distance_to(o.id), o.is_bot,
         lm.body, lm.image_path is not null, lm.created_at, lm.sender_id,
         coalesce(mc.n, 0)::int
  from public.matches m
  cross join me
  join public.profiles o on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  left join lateral (select count(*) as n from public.messages where match_id = m.id) mc on true
  where me.id in (m.profile_a, m.profile_b)
    and not public.is_blocked_pair(me.id, o.id)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- ---------------------------------------------------------------------
-- 6. Permissions
-- ---------------------------------------------------------------------
revoke all on function public.get_candidates(), public.get_inbox(), public.set_my_location(float8, float8),
  public.has_my_location(), public.block_profile(uuid), public.unblock_profile(uuid),
  public.report_profile(uuid, text, text, uuid, boolean), public.get_blocked(), public.distance_to(uuid)
  from public, anon;
grant execute on function public.get_candidates(), public.get_inbox(), public.set_my_location(float8, float8),
  public.has_my_location(), public.block_profile(uuid), public.unblock_profile(uuid),
  public.report_profile(uuid, text, text, uuid, boolean), public.get_blocked(), public.distance_to(uuid)
  to authenticated;

-- PostgREST picks up the new functions immediately.
notify pgrst, 'reload schema';
