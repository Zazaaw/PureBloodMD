-- =====================================================================
-- PureBloodMD: schema, row level security, and game rules
-- Run this FIRST in the Supabase SQL Editor, then run supabase/seed.sql.
--
-- Rules enforced in the database (not just in the UI):
--   1. Bumble protocol: in a female x male match, the female doctor sends
--      the first message. Same-gender matches: anyone can start.
--   2. Free quota: 10 bubbles per conversation, then VIP only.
--   3. Bot doctors (the 420 seeded profiles) always like you back and
--      reply to every message with a line from their joke bank.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique references auth.users (id) on delete cascade,
  is_bot             boolean not null default false,
  is_featured        boolean not null default false,
  display_name       text not null check (char_length(display_name) between 3 and 80),
  gender             text not null check (gender in ('female', 'male')),
  seeking            text not null default 'all' check (seeking in ('female', 'male', 'all')),
  age                int  not null check (age between 21 and 90),
  specialty          text not null check (specialty in (
                       'Cardiology', 'Surgery', 'OBGYN', 'Orthopedics', 'Psychiatry',
                       'Neurosurgery', 'Neurology', 'Anesthesiology', 'Dermatology',
                       'Radiology', 'Ophthalmology', 'PlasticSurgery', 'Pediatrics', 'Pulmonology')),
  specialty_title    text not null check (char_length(specialty_title) between 2 and 80),
  hospital           text not null check (char_length(hospital) between 2 and 120),
  base_city          text not null check (base_city in ('Jaksel', 'Jakpus', 'Jakbar', 'Tangsel', 'Depok', 'Bandung', 'Surabaya')),
  distance_km        numeric(4, 1) not null default 5 check (distance_km between 0 and 99),
  -- Every profile MUST have a real photo. No photo, no profile.
  photo_url          text not null check (photo_url ~ '^https://'),
  photo_fallback_url text,
  caffeine           text not null default '' check (char_length(caffeine) <= 60),
  stamina            text not null default '' check (char_length(stamina) <= 60),
  manner             text not null default '' check (char_length(manner) <= 60),
  status_text        text not null default 'Post-call • Available' check (char_length(status_text) <= 60),
  bio                text not null default '' check (char_length(bio) <= 400),
  tags               text[] not null default '{}' check (cardinality(tags) <= 8),
  replies            text[] not null default '{}',
  opener             text,
  is_vip             boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint bots_have_no_user check (not is_bot or user_id is null),
  constraint humans_have_user check (is_bot or user_id is not null)
);

create index profiles_specialty_gender_idx on public.profiles (specialty, gender);

-- Private credentials, visible only to their owner (the "Doctor Passport").
create table public.credentials (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  str_number   text not null check (str_number ~ '^[A-Z0-9-]{6,32}$'),
  alma_mater   text not null check (char_length(alma_mater) between 2 and 80),
  class_year   int  not null check (class_year between 1970 and 2035),
  created_at   timestamptz not null default now()
);

create table public.swipes (
  swiper_id   uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  direction   text not null check (direction in ('left', 'right', 'super')),
  created_at  timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);

create index swipes_target_idx on public.swipes (target_id, direction);

-- A match is stored once per pair, with profile_a < profile_b.
create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  profile_a   uuid not null references public.profiles (id) on delete cascade,
  profile_b   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (profile_a < profile_b),
  unique (profile_a, profile_b)
);

create index matches_b_idx on public.matches (profile_b);

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index messages_match_created_idx on public.messages (match_id, created_at);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.my_profile_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_match_member(p_match uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match
      and public.my_profile_id() in (m.profile_a, m.profile_b)
  )
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.credentials enable row level security;
alter table public.swipes      enable row level security;
alter table public.matches     enable row level security;
alter table public.messages    enable row level security;

-- Profiles: every signed-in doctor can browse; you only write your own row.
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);

create policy "insert own profile"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid() and is_bot = false and is_featured = false and is_vip = false);

create policy "update own profile"
  on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Users may only touch the editable columns. is_vip, is_bot, replies, etc.
-- can only change through security-definer functions below.
revoke update on public.profiles from authenticated;
grant update (display_name, seeking, age, specialty, specialty_title, hospital, base_city,
              photo_url, caffeine, stamina, manner, status_text, bio, tags)
  on public.profiles to authenticated;

create policy "own credentials"
  on public.credentials for all to authenticated
  using (profile_id = public.my_profile_id())
  with check (profile_id = public.my_profile_id());

-- Swipes go through swipe_profile(); you can read your own history.
create policy "read own swipes"
  on public.swipes for select to authenticated
  using (swiper_id = public.my_profile_id());

create policy "read own matches"
  on public.matches for select to authenticated
  using (public.my_profile_id() in (profile_a, profile_b));

create policy "read messages in my matches"
  on public.messages for select to authenticated
  using (public.is_match_member(match_id));

create policy "send messages as myself in my matches"
  on public.messages for insert to authenticated
  with check (sender_id = public.my_profile_id() and public.is_match_member(match_id));

-- ---------------------------------------------------------------------
-- Message rules (Bumble protocol + free quota) and bot replies
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
    return new;  -- bots are exempt; their replies are triggered by humans
  end if;

  select * into v_match from public.matches where id = new.match_id;
  select * into v_other from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  select count(*) into v_count from public.messages where match_id = new.match_id;

  -- Bumble protocol: male cannot open a female x male conversation.
  if v_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
    raise exception 'bumble_wait' using hint = 'The female doctor makes the first incision.';
  end if;

  -- Free consult allowance.
  if v_count >= 10 and not v_sender.is_vip then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

create trigger messages_rules
  before insert on public.messages
  for each row execute function public.enforce_message_rules();

create or replace function public.bot_auto_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_match  public.matches;
  v_bot    public.profiles;
begin
  select * into v_match from public.matches where id = new.match_id;
  select * into v_bot from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if v_bot.is_bot and new.sender_id <> v_bot.id and cardinality(v_bot.replies) > 0 then
    insert into public.messages (match_id, sender_id, body, created_at)
    values (new.match_id, v_bot.id,
            v_bot.replies[1 + floor(random() * cardinality(v_bot.replies))::int],
            now() + interval '1 second');
  end if;
  return null;
end;
$$;

create trigger messages_bot_reply
  after insert on public.messages
  for each row execute function public.bot_auto_reply();

-- ---------------------------------------------------------------------
-- RPCs called by the app
-- ---------------------------------------------------------------------

-- Discover deck: everyone I have not swiped on yet (bots and humans).
create or replace function public.get_candidates()
returns setof public.profiles
language sql stable security definer set search_path = ''
as $$
  select p.*
  from public.profiles p
  where p.id <> public.my_profile_id()
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = public.my_profile_id() and s.target_id = p.id
    )
  order by p.is_featured desc, md5(p.id::text || coalesce(public.my_profile_id()::text, ''))
$$;

-- Swipe. Returns { matched, match_id }. Bots always swipe back.
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
  if v_me.id is null then
    raise exception 'no_profile';
  end if;
  if p_direction not in ('left', 'right', 'super') then
    raise exception 'bad_direction';
  end if;

  select * into v_target from public.profiles where id = p_target;
  if v_target.id is null or v_target.id = v_me.id then
    raise exception 'bad_target';
  end if;

  insert into public.swipes (swiper_id, target_id, direction)
  values (v_me.id, v_target.id, p_direction)
  on conflict (swiper_id, target_id) do update set direction = excluded.direction, created_at = now();

  if p_direction = 'left' then
    return jsonb_build_object('matched', false);
  end if;

  v_liked_back := v_target.is_bot or exists (
    select 1 from public.swipes
    where swiper_id = v_target.id and target_id = v_me.id and direction in ('right', 'super')
  );

  if not v_liked_back then
    return jsonb_build_object('matched', false);
  end if;

  insert into public.matches (profile_a, profile_b)
  values (least(v_me.id, v_target.id), greatest(v_me.id, v_target.id))
  on conflict (profile_a, profile_b) do nothing
  returning id into v_match;

  if v_match is null then
    select id into v_match from public.matches
    where profile_a = least(v_me.id, v_target.id) and profile_b = greatest(v_me.id, v_target.id);
  elsif v_target.is_bot and v_target.opener is not null
        and not (v_target.gender = 'male' and v_me.gender = 'female') then
    -- Bot opens the chat, unless that would break the Bumble protocol.
    insert into public.messages (match_id, sender_id, body) values (v_match, v_target.id, v_target.opener);
  end if;

  return jsonb_build_object('matched', true, 'match_id', v_match);
end;
$$;

-- Put discharged (left-swiped) doctors back in the deck.
create or replace function public.reset_passes()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.swipes where swiper_id = public.my_profile_id() and direction = 'left'
$$;

-- Starter consults right after onboarding: a few featured doctors already matched.
create or replace function public.seed_starter_matches()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_me    public.profiles;
  v_bot   public.profiles;
  v_match uuid;
  v_n     int := 0;
begin
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  if exists (select 1 from public.matches where v_me.id in (profile_a, profile_b)) then
    return 0;
  end if;

  for v_bot in
    select * from public.profiles
    where is_featured and (v_me.seeking = 'all' or gender = v_me.seeking)
    order by created_at, display_name
    limit 5
  loop
    insert into public.swipes (swiper_id, target_id, direction) values (v_me.id, v_bot.id, 'right')
      on conflict do nothing;
    insert into public.matches (profile_a, profile_b)
      values (least(v_me.id, v_bot.id), greatest(v_me.id, v_bot.id))
      on conflict do nothing
      returning id into v_match;
    if v_match is not null and v_bot.opener is not null
       and not (v_bot.gender = 'male' and v_me.gender = 'female') then
      insert into public.messages (match_id, sender_id, body) values (v_match, v_bot.id, v_bot.opener);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Inbox: my matches with the other doctor, last message, and bubble count.
create or replace function public.get_inbox()
returns table (
  match_id uuid,
  matched_at timestamptz,
  other_id uuid,
  other_name text,
  other_gender text,
  other_photo text,
  other_photo_fallback text,
  other_specialty_title text,
  other_hospital text,
  other_distance numeric,
  other_is_bot boolean,
  last_body text,
  last_at timestamptz,
  last_sender uuid,
  bubble_count int
)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select m.id, m.created_at,
         o.id, o.display_name, o.gender, o.photo_url, o.photo_fallback_url,
         o.specialty_title, o.hospital, o.distance_km, o.is_bot,
         lm.body, lm.created_at, lm.sender_id,
         coalesce(mc.n, 0)::int
  from public.matches m
  cross join me
  join public.profiles o
    on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join lateral (
    select body, created_at, sender_id from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  left join lateral (
    select count(*) as n from public.messages where match_id = m.id
  ) mc on true
  where me.id in (m.profile_a, m.profile_b)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- Demo VIP switch. There is NO real payment in this project.
create or replace function public.activate_vip_demo()
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles set is_vip = true where user_id = auth.uid()
$$;

revoke all on function public.get_candidates(), public.swipe_profile(uuid, text), public.reset_passes(),
  public.seed_starter_matches(), public.get_inbox(), public.activate_vip_demo() from public, anon;
grant execute on function public.get_candidates(), public.swipe_profile(uuid, text), public.reset_passes(),
  public.seed_starter_matches(), public.get_inbox(), public.activate_vip_demo() to authenticated;

-- ---------------------------------------------------------------------
-- Realtime: stream new messages to the chat room
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- Storage: profile photos (public bucket, each user writes only their folder)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatar upload into own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
