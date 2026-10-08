-- PureBloodMD migration 0005. Paste into Supabase SQL Editor and click Run.
-- =====================================================================
-- PureBloodMD 0005: real verification badge, Super Like, 4-photo gallery,
-- automatic phone-number masking in chat. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verification: the badge means ID (KTP) AND medical license were reviewed
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists identity_verified boolean not null default false;
alter table public.profiles add column if not exists doctor_verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;

create table if not exists public.verification_requests (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  id_doc_path    text not null,   -- KTP / passport photo
  selfie_path    text not null,   -- selfie holding the ID
  license_path   text not null,   -- STR / SIP, or student card for medical students
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note  text check (char_length(reviewer_note) <= 500),
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);
-- Nobody can create a profile that is already verified (the flags are set only by review).
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid() and is_bot = false and is_featured = false and is_vip = false
              and identity_verified = false and doctor_verified = false);

create index if not exists verification_requests_status_idx on public.verification_requests (status, created_at);
alter table public.verification_requests enable row level security;
drop policy if exists "read own verification" on public.verification_requests;
create policy "read own verification" on public.verification_requests for select to authenticated
  using (profile_id = public.my_profile_id());

-- Private bucket: users can upload into their own folder but never read anyone's documents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
drop policy if exists "verification upload own folder" on storage.objects;
create policy "verification upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.submit_verification(p_id_doc text, p_selfie text, p_license text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id(); v_prefix text := auth.uid()::text || '/';
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if not (p_id_doc like v_prefix || '%' and p_selfie like v_prefix || '%' and p_license like v_prefix || '%') then
    raise exception 'bad_paths';
  end if;
  if exists (select 1 from public.verification_requests where profile_id = v_me and status = 'pending') then
    raise exception 'already_pending';
  end if;
  insert into public.verification_requests (profile_id, id_doc_path, selfie_path, license_path)
  values (v_me, p_id_doc, p_selfie, p_license);
end;
$$;

-- Reviewers approve/reject in the dashboard (Table Editor) by changing `status`.
create or replace function public.apply_verification_review()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    new.reviewed_at := now();
    if new.status = 'approved' then
      update public.profiles set identity_verified = true, doctor_verified = true, verified_at = now()
      where id = new.profile_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists verification_review on public.verification_requests;
create trigger verification_review before update on public.verification_requests
  for each row execute function public.apply_verification_review();

-- Demo bots: about half carry the badge so both states show up in triage.
update public.profiles
set identity_verified = true, doctor_verified = true, verified_at = coalesce(verified_at, now())
where is_bot and (is_featured or abs(hashtext(id::text)) % 2 = 0);

-- ---------------------------------------------------------------------
-- 2. Gallery: up to 3 extra photos (4 in total with photo_url)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists gallery text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_gallery_check;
alter table public.profiles add constraint profiles_gallery_check check (cardinality(gallery) <= 3);
grant update (gallery) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 3. Super Like: once per profile, 1 per 24h free, 5 per 24h for VIP
-- ---------------------------------------------------------------------
create or replace function public.superlike_quota()
returns table (used int, quota int, next_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       recent as (
         select s.created_at from public.swipes s, me
         where s.swiper_id = me.id and s.direction = 'super' and s.created_at > now() - interval '24 hours'
       )
  select (select count(*) from recent)::int,
         case when public.vip_active((select id from me)) then 5 else 1 end,
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

-- Deck: one country at a time (PostgREST caps RPC results at 1000 rows, and the
-- roster is bigger than that), people who Super Liked me first and flagged.
drop function if exists public.get_candidates();
drop function if exists public.get_candidates(text);
create function public.get_candidates(p_country text default null)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       ml as (select l.lat, l.lng from public.locations l, me where l.profile_id = me.id)
  select (to_jsonb(p) - 'replies' - 'opener' - 'user_id' - 'base_city')
         || jsonb_build_object(
              'distance_km', (select public.km_between(ml.lat, ml.lng, l.lat, l.lng) from ml, public.locations l where l.profile_id = p.id),
              'superliked_me', exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super'))
  from public.profiles p, me
  where p.id <> me.id
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = p.id)
    and not public.is_blocked_pair(me.id, p.id)
    and p.country = coalesce(p_country, (select country from public.profiles where id = me.id), 'ID')
  order by exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super') desc,
           p.is_featured desc, md5(p.id::text || me.id::text)
$$;

-- New members: a few demo doctors Super Like them right away, so the feature is visible.
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
    insert into public.swipes (swiper_id, target_id, direction) values (v_me.id, v_bot.id, 'right') on conflict do nothing;
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

  insert into public.swipes (swiper_id, target_id, direction)
  select b.id, v_me.id, 'super' from public.profiles b
  where b.is_bot and not b.is_featured and b.country = v_me.country
    and (v_me.seeking = 'all' or b.gender = v_me.seeking)
  order by md5(b.id::text || v_me.id::text)
  limit 3
  on conflict do nothing;

  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Chat: phone numbers and WhatsApp/Telegram links are masked server-side
-- ---------------------------------------------------------------------
create or replace function public.mask_contact_info(p_body text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_out text := p_body;
  v_hit text;
begin
  -- Chat-app links: wa.me/62812..., api.whatsapp.com/send?phone=..., t.me/handle
  v_out := regexp_replace(v_out, '(https?://)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|line\.me)/\S*', '[contact link hidden]', 'gi');
  -- Any run of 9+ digits, allowing spaces, dots, dashes and brackets in between
  -- (phone numbers, bank accounts, NIK). Digits become asterisks, layout stays.
  for v_hit in select (regexp_matches(v_out, '\+?\d[\d\s().-]{7,}\d', 'g'))[1] loop
    if length(regexp_replace(v_hit, '\D', '', 'g')) >= 9 then
      v_out := replace(v_out, v_hit, translate(v_hit, '0123456789', '**********'));
    end if;
  end loop;
  return v_out;
end;
$$;

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
  if v_match.bubble_count = 0 and v_sender.gender = 'male' and v_other.gender = 'female' then
    raise exception 'bumble_wait' using hint = 'The female doctor makes the first incision.';
  end if;
  if v_match.bubble_count >= 10 and not public.vip_active(v_sender.id) then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := public.mask_contact_info(btrim(new.body));
  new.created_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Inbox carries the verified flag
-- ---------------------------------------------------------------------
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
revoke all on function public.submit_verification(text, text, text), public.superlike_quota(), public.get_candidates(text),
  public.get_inbox(), public.swipe_profile(uuid, text), public.seed_starter_matches() from public, anon;
grant execute on function public.submit_verification(text, text, text), public.superlike_quota(), public.get_candidates(text),
  public.get_inbox(), public.swipe_profile(uuid, text), public.seed_starter_matches() to authenticated;

notify pgrst, 'reload schema';
