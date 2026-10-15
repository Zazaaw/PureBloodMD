-- 0025: the Consults badge counts what needs you, not every match.
--   * consult_reads: when each member last opened each consult.
--   * get_inbox: + unread (their messages since I last opened it) and opened.
--   * unread_consults_count(): chats with unread messages + new matches never opened.
--   * Existing consults start as read, so nobody gets a sudden wall of badges.

create table if not exists public.consult_reads (
  match_id   uuid not null references public.matches (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (match_id, profile_id)
);
alter table public.consult_reads enable row level security;
drop policy if exists "read own consult reads" on public.consult_reads;
create policy "read own consult reads" on public.consult_reads for select to authenticated
  using (profile_id = public.my_profile_id());

insert into public.consult_reads (match_id, profile_id, read_at)
select id, profile_a, now() from public.matches
union all
select id, profile_b, now() from public.matches
on conflict do nothing;

create or replace function public.mark_consult_read(p_match uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_match_member(p_match) then raise exception 'not_member'; end if;
  insert into public.consult_reads (match_id, profile_id, read_at)
  values (p_match, public.my_profile_id(), now())
  on conflict (match_id, profile_id) do update set read_at = excluded.read_at;
end;
$$;
revoke all on function public.mark_consult_read(uuid) from public, anon;
grant execute on function public.mark_consult_read(uuid) to authenticated;

drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, other_verified boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int, expires_at timestamptz, other_is_founder boolean,
  other_gallery text[], chat_hidden boolean, unread int, opened boolean)
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
         o.is_founder,
         o.gallery,
         h.hidden_at is not null and lm.created_at is null,
         (select count(*)::int from public.messages x
          where x.match_id = m.id and x.sender_id <> me.id
            and x.created_at > greatest(coalesce(r.read_at, '-infinity'::timestamptz), coalesce(h.hidden_at, '-infinity'::timestamptz))),
         r.read_at is not null
  from public.matches m
  cross join me
  join public.profiles o on o.id = case when m.profile_a = me.id then m.profile_b else m.profile_a end
  left join public.consult_hides h on h.match_id = m.id and h.profile_id = me.id
  left join public.consult_reads r on r.match_id = m.id and r.profile_id = me.id
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
    where match_id = m.id and created_at > coalesce(h.hidden_at, '-infinity'::timestamptz)
    order by created_at desc limit 1
  ) lm on true
  where me.id in (m.profile_a, m.profile_b)
    and not public.is_blocked_pair(me.id, o.id)
    and not public.consult_flatlined(m)
    and o.deactivated_at is null
  order by coalesce(lm.created_at, m.created_at) desc
$$;

revoke all on function public.get_inbox() from public, anon;
grant execute on function public.get_inbox() to authenticated;
notify pgrst, 'reload schema';

create or replace function public.unread_consults_count()
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.get_inbox() i
  where i.unread > 0 or (i.bubble_count = 0 and not i.opened)
$$;
revoke all on function public.unread_consults_count() from public, anon;
grant execute on function public.unread_consults_count() to authenticated;
notify pgrst, 'reload schema';
