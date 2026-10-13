-- 0020
--   * Romance looks for one gender; only Connect may look for both. A trigger keeps it
--     true whatever the client sends ("Both" under Romance becomes the other gender).
--   * get_inbox: returns every match, including chats hidden with hide_consult, so the
--     match circles (stories row) keep showing people you are still matched with.
--     Adds other_gallery for the photo story and chat_hidden for the list below.

create or replace function public.fit_romance_seeking()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not new.is_bot and coalesce(new.intent, 'romance') = 'romance' and new.seeking = 'all' then
    new.seeking := case when new.gender = 'male' then 'female' else 'male' end;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_fit_romance_seeking on public.profiles;
create trigger profiles_fit_romance_seeking
  before insert or update of seeking, intent, gender on public.profiles
  for each row execute function public.fit_romance_seeking();

-- Existing romance members on "Both".
update public.profiles set seeking = seeking
where not is_bot and coalesce(intent, 'romance') = 'romance' and seeking = 'all';

drop function if exists public.get_inbox();
create function public.get_inbox()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text, other_gender text,
  other_photo text, other_photo_fallback text, other_specialty_title text, other_hospital text,
  other_distance numeric, other_is_bot boolean, other_verified boolean, last_body text, last_is_image boolean,
  last_at timestamptz, last_sender uuid, bubble_count int, expires_at timestamptz, other_is_founder boolean,
  other_gallery text[], chat_hidden boolean)
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
         h.hidden_at is not null and lm.created_at is null
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
  order by coalesce(lm.created_at, m.created_at) desc
$$;

revoke all on function public.get_inbox() from public, anon;
grant execute on function public.get_inbox() to authenticated;
notify pgrst, 'reload schema';
