-- 0009: romance vs connect, and an empty inbox after sign-up.
--   * profiles.intent: 'romance' (dating) or 'connect' (meet colleagues).
--     Real members only meet members with the same intent; bot doctors serve both.
--     Connect: bots talk shop instead of flirting, and the "she writes first" rule is off.
--   * No more starter matches: new members start with an empty consult list.
--     (A few demo doctors still Super Like them so triage has something to find.)

alter table public.profiles add column if not exists intent text not null default 'romance';
alter table public.profiles drop constraint if exists profiles_intent_check;
alter table public.profiles add constraint profiles_intent_check check (intent in ('romance', 'connect'));
grant update (intent) on public.profiles to authenticated;

-- Collegial lines for connect mode ({spec} = the bot's specialty title).
create or replace function public.connect_line(p_bot public.profiles, p_kind text)
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  v_lines text[];
  v_spec text := coalesce(nullif(p_bot.specialty_title, ''), 'doctor');
begin
  if p_kind = 'opener' then
    v_lines := array[
      'Hi! Fellow ' || v_spec || ' here 👋 Always good to connect with another doctor.',
      'Hello, colleague! Which hospital are you rotating at these days?',
      'Hey! Nice to meet another doc on here. How is the workload treating you?'
    ];
  elsif p_kind = 'photo' then
    v_lines := array[
      'Image received. Clinically unremarkable, socially excellent 📋',
      'Saving this for grand rounds. Kidding. Mostly 😄',
      'Nice one! Better quality than half the X-rays I read today.'
    ];
  else
    v_lines := array[
      'Same here. Night shifts build character, or so they tell us 🫡',
      'If you ever need a second opinion from a ' || v_spec || ', I am around. No patient data in chat though 😄',
      'Conference season is coming. Are you presenting anything?',
      'Always looking for good referral buddies. Where do you usually practice?',
      'Honestly the best part of this job is the colleagues. And the vending machine coffee ☕',
      'What made you pick your specialty? I picked mine for the sleep. It did not work out.',
      'Let us grab coffee after a conference sometime. Strictly professional networking ☕'
    ];
  end if;
  return v_lines[1 + floor(random() * cardinality(v_lines))::int];
end;
$$;

-- Bots reply in the register of the human they're talking to.
create or replace function public.bot_auto_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_match  public.matches;
  v_bot    public.profiles;
  v_human  public.profiles;
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
  if not v_bot.is_bot or new.sender_id = v_bot.id then return null; end if;
  select * into v_human from public.profiles where id = new.sender_id;

  if v_human.intent = 'connect' then
    insert into public.messages (match_id, sender_id, body, created_at)
    values (new.match_id, v_bot.id,
            public.connect_line(v_bot, case when new.image_path is not null then 'photo' else 'reply' end),
            now() + interval '1 second');
  elsif cardinality(v_bot.replies) > 0 then
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

-- Swipe: same as 0008, plus intent-aware bot openers.
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
  if not v_target.is_bot and v_target.intent <> v_me.intent then raise exception 'bad_target'; end if;

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
  elsif v_target.is_bot then
    if v_me.intent = 'connect' then
      -- Colleagues: either side may start, the bot says hello.
      insert into public.messages (match_id, sender_id, body) values (v_match, v_target.id, public.connect_line(v_target, 'opener'));
    elsif v_target.opener is not null and not (v_target.gender = 'male' and v_me.gender = 'female') then
      -- Romance: a female bot opens; with a male bot, she makes the first incision.
      insert into public.messages (match_id, sender_id, body) values (v_match, v_target.id, v_target.opener);
    end if;
  end if;

  return jsonb_build_object('matched', true, 'match_id', v_match, 'super', p_direction = 'super');
end;
$$;

-- Bumble rule only in romance.
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
  if v_sender.intent = 'romance' and v_match.bubble_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
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

-- Empty start: only a few demo Super Likes, no matches, no openers.
create or replace function public.seed_starter_matches()
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_me public.profiles;
begin
  select * into v_me from public.profiles where user_id = auth.uid();
  if v_me.id is null then raise exception 'no_profile'; end if;
  insert into public.swipes (swiper_id, target_id, direction)
  select b.id, v_me.id, 'super' from public.profiles b
  where b.is_bot and not b.is_featured and b.country = v_me.country
    and (v_me.seeking = 'all' or b.gender = v_me.seeking)
  order by md5(b.id::text || v_me.id::text)
  limit 3
  on conflict do nothing;
  return 0;
end;
$$;

-- Deck: same as 0008, plus "real members only meet the same intent".
drop function if exists public.get_candidates(text);
create function public.get_candidates(p_country text default null)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (select p.id, p.intent, p.country from public.profiles p where p.id = public.my_profile_id()),
       ml as (select l.lat, l.lng from public.locations l, me where l.profile_id = me.id),
       cc as (
         select case when coalesce(p_country, me.country) = any (public.active_countries())
                     then coalesce(p_country, me.country)
                     else (public.active_countries())[1] end as code
         from me
       )
  select (to_jsonb(p) - 'replies' - 'opener' - 'user_id' - 'base_city' - 'deactivated_at')
         || jsonb_build_object(
              'distance_km', (select public.km_between(ml.lat, ml.lng, l.lat, l.lng) from ml, public.locations l where l.profile_id = p.id),
              'superliked_me', exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super'))
  from public.profiles p, me, cc
  where p.id <> me.id
    and p.deactivated_at is null
    and (p.is_bot or p.intent = me.intent)
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = p.id)
    and not public.is_blocked_pair(me.id, p.id)
    and p.country = cc.code
  order by exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super') desc,
           p.is_featured desc, md5(p.id::text || me.id::text)
$$;

revoke all on function public.connect_line(public.profiles, text), public.swipe_profile(uuid, text),
  public.seed_starter_matches(), public.get_candidates(text) from public, anon;
grant execute on function public.swipe_profile(uuid, text), public.seed_starter_matches(), public.get_candidates(text) to authenticated;

notify pgrst, 'reload schema';
