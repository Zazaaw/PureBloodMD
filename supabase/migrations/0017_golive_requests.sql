-- 0017: go-live requests.
--   * Report reasons: "impersonating someone (or me)" and "fake account".
--   * Verification without the selfie-holding-ID photo: ID card + medical license only.
--   * Swipe-to-delete in the consult list deletes the chat FOR ME only and keeps the match
--     (consult_hides). A new message from either side brings the room back with only the
--     messages after the delete. Unmatch stays a separate, explicit action.

-- ---------------------------------------------------------------------
-- 1. Report reasons
-- ---------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check check (reason in (
  'sexual_harassment', 'unsolicited_explicit_content', 'verbal_abuse', 'threats', 'hate_speech',
  'impersonation', 'fake_profile', 'scam_or_spam', 'underage', 'self_harm', 'other'));

-- ---------------------------------------------------------------------
-- 2. Verification: selfie no longer required
-- ---------------------------------------------------------------------
alter table public.verification_requests alter column selfie_path drop not null;

drop function if exists public.submit_verification(text, text, text);
create or replace function public.submit_verification(p_id_doc text, p_license text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id(); v_prefix text := auth.uid()::text || '/';
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if not (p_id_doc like v_prefix || '%' and p_license like v_prefix || '%') then
    raise exception 'bad_paths';
  end if;
  if exists (select 1 from public.verification_requests where profile_id = v_me and status = 'pending') then
    raise exception 'already_pending';
  end if;
  insert into public.verification_requests (profile_id, id_doc_path, license_path)
  values (v_me, p_id_doc, p_license);
end;
$$;
revoke all on function public.submit_verification(text, text) from public, anon;
grant execute on function public.submit_verification(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Delete chat for me (keeps the match)
-- ---------------------------------------------------------------------
create table if not exists public.consult_hides (
  match_id   uuid not null references public.matches (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hidden_at  timestamptz not null default now(),
  primary key (match_id, profile_id)
);
alter table public.consult_hides enable row level security;

create or replace function public.hide_consult(p_match uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if not public.is_match_member(p_match) then raise exception 'not_member'; end if;
  insert into public.consult_hides (match_id, profile_id, hidden_at) values (p_match, v_me, now())
  on conflict (match_id, profile_id) do update set hidden_at = now();
end;
$$;
revoke all on function public.hide_consult(uuid) from public, anon;
grant execute on function public.hide_consult(uuid) to authenticated;

-- My copy of a deleted chat starts after the delete.
drop policy if exists "read messages in my matches" on public.messages;
create policy "read messages in my matches" on public.messages for select to authenticated
  using (
    public.is_match_member(match_id)
    and not exists (
      select 1 from public.consult_hides h
      where h.match_id = messages.match_id and h.profile_id = public.my_profile_id() and messages.created_at <= h.hidden_at)
  );

drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, other_verified boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int, expires_at timestamptz, other_is_founder boolean)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select m.id, m.created_at,
         o.id, o.display_name, o.gender, o.photo_url, o.photo_fallback_url,
         o.specialty_title, o.hospital, public.distance_to(o.id), o.is_bot,
         o.identity_verified and o.doctor_verified,
         lm.body, lm.image_path is not null, lm.created_at, lm.sender_id,
         m.bubble_count,
         public.consult_expires_at(m),
         o.is_founder
  from public.matches m
  cross join me
  join public.profiles o on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join public.consult_hides h on h.match_id = m.id and h.profile_id = me.id
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where match_id = m.id and created_at > coalesce(h.hidden_at, '-infinity'::timestamptz)
    order by created_at desc limit 1
  ) lm on true
  where me.id in (m.profile_a, m.profile_b)
    and not public.is_blocked_pair(me.id, o.id)
    and not public.consult_flatlined(m)
    and o.deactivated_at is null
    and (h.hidden_at is null or lm.created_at is not null)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

revoke all on function public.get_inbox() from public, anon;
grant execute on function public.get_inbox() to authenticated;
notify pgrst, 'reload schema';
