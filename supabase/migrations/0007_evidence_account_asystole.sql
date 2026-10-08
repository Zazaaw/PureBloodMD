-- 0007: report evidence, deactivate / delete account, 24-hour asystole expiry.

-- ---------------------------------------------------------------------
-- 1. Report evidence: up to 4 screenshots + a transcript snapshot
-- ---------------------------------------------------------------------
alter table public.reports add column if not exists evidence text[] not null default '{}';
alter table public.reports add column if not exists transcript jsonb;
alter table public.reports drop constraint if exists reports_evidence_max;
alter table public.reports add constraint reports_evidence_max check (cardinality(evidence) <= 4);

-- Private bucket: members upload into their own folder and can never read it back.
-- Only reviewers (service role / dashboard) open the files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-evidence', 'report-evidence', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "evidence upload own folder" on storage.objects;
create policy "evidence upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop function if exists public.report_profile(uuid, text, text, uuid, boolean);
create or replace function public.report_profile(
  p_target uuid, p_reason text, p_details text default '', p_match uuid default null,
  p_block boolean default true, p_evidence text[] default '{}')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.my_profile_id();
  v_prefix text := auth.uid()::text || '/';
  v_path text;
  v_transcript jsonb;
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
  if cardinality(coalesce(p_evidence, '{}')) > 4 then raise exception 'too_much_evidence'; end if;
  foreach v_path in array coalesce(p_evidence, '{}') loop
    if v_path not like v_prefix || '%' then raise exception 'bad_evidence_path'; end if;
  end loop;

  -- Consults can expire after 24 hours, so keep a copy of the conversation with the report.
  if p_match is not null then
    select jsonb_agg(jsonb_build_object(
             'sender', case when x.sender_id = v_me then 'reporter' else 'reported' end,
             'body', x.body, 'image_path', x.image_path, 'sent_at', x.created_at) order by x.created_at)
      into v_transcript
    from (select * from public.messages where match_id = p_match order by created_at desc limit 100) x;
  end if;

  insert into public.reports (reporter_id, reported_id, match_id, reason, details, evidence, transcript)
  values (v_me, p_target, p_match, p_reason, left(coalesce(btrim(p_details), ''), 1000), coalesce(p_evidence, '{}'), v_transcript);
  if p_block then
    insert into public.blocks (blocker_id, blocked_id) values (v_me, p_target) on conflict do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Deactivate (pause) and delete account
-- ---------------------------------------------------------------------
-- Not in the column grant: only the RPC below can change it.
alter table public.profiles add column if not exists deactivated_at timestamptz;

create or replace function public.set_account_active(p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  update public.profiles
     set deactivated_at = case when p_active then null else coalesce(deactivated_at, now()) end
   where id = v_me;
end;
$$;

-- Deletes the auth user; the profile, swipes, matches, messages, reports by
-- and about them cascade. The client removes its own storage files first.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Asystole: a consult with no message for 24 hours flatlines
--    (counted from the last message, or from the match if nobody wrote).
--    The room is deleted and the pair's swipes are cleared, so they can
--    meet again in triage and get a second chance.
-- ---------------------------------------------------------------------
create or replace function public.consult_flatlined(p_match public.matches)
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(p_match.last_activity_at, p_match.created_at) < now() - interval '24 hours'
$$;

create or replace function public.purge_stale_consults()
returns int
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  with dead as (
    delete from public.matches m
    where coalesce(m.last_activity_at, m.created_at) < now() - interval '24 hours'
    returning m.profile_a, m.profile_b
  ), cleared as (
    delete from public.swipes s using dead d
    where (s.swiper_id = d.profile_a and s.target_id = d.profile_b)
       or (s.swiper_id = d.profile_b and s.target_id = d.profile_a)
  )
  select count(*) into n from dead;
  return n;
end;
$$;

-- Every 5 minutes instead of hourly: the countdown in chat is to the minute.
select cron.unschedule(jobid) from cron.job where jobname = 'purebloodmd-purge-stale-consults';
select cron.schedule('purebloodmd-purge-stale-consults', '*/5 * * * *', 'select public.purge_stale_consults()');

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
    raise exception 'consult_expired' using hint = 'Asystole: 24 hours without a message.';
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
  if v_match.bubble_count >= 10 and not public.vip_active(v_sender.id) then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := public.mask_contact_info(btrim(new.body));
  new.created_at := now();
  return new;
end;
$$;

-- Inbox: 24-hour expiry, hides flatlined rooms (between purge runs) and paused doctors.
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
         coalesce(m.last_activity_at, m.created_at) + interval '24 hours'
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

-- Deck: paused doctors are hidden.
drop function if exists public.get_candidates(text);
create function public.get_candidates(p_country text default null)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id),
       ml as (select l.lat, l.lng from public.locations l, me where l.profile_id = me.id)
  select (to_jsonb(p) - 'replies' - 'opener' - 'user_id' - 'base_city' - 'deactivated_at')
         || jsonb_build_object(
              'distance_km', (select public.km_between(ml.lat, ml.lng, l.lat, l.lng) from ml, public.locations l where l.profile_id = p.id),
              'superliked_me', exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super'))
  from public.profiles p, me
  where p.id <> me.id
    and p.deactivated_at is null
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = p.id)
    and not public.is_blocked_pair(me.id, p.id)
    and p.country = coalesce(p_country, (select country from public.profiles where id = me.id), 'ID')
  order by exists (select 1 from public.swipes s where s.swiper_id = p.id and s.target_id = me.id and s.direction = 'super') desc,
           p.is_featured desc, md5(p.id::text || me.id::text)
$$;

-- ---------------------------------------------------------------------
-- 4. Permissions
-- ---------------------------------------------------------------------
revoke all on function public.report_profile(uuid, text, text, uuid, boolean, text[]), public.set_account_active(boolean),
  public.delete_my_account(), public.get_inbox(), public.get_candidates(text), public.purge_stale_consults(),
  public.consult_flatlined(public.matches) from public, anon;
grant execute on function public.report_profile(uuid, text, text, uuid, boolean, text[]), public.set_account_active(boolean),
  public.delete_my_account(), public.get_inbox(), public.get_candidates(text), public.consult_flatlined(public.matches)
  to authenticated;

notify pgrst, 'reload schema';
