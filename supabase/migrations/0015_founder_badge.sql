-- 0015: founder badge.
--   * founder_emails lists the founders; profiles.is_founder is set from it by a trigger
--     (on insert, and backfilled here), never by members (not in the column grant).
--   * The flag rides along everywhere a profile is shown: deck (to_jsonb), EMR author, inbox.

create table if not exists public.founder_emails (email text primary key check (email = lower(email)));
alter table public.founder_emails enable row level security;
insert into public.founder_emails (email) values ('faizandhilmi@gmail.com'), ('sonyasyahirah@gmail.com')
on conflict do nothing;

alter table public.profiles add column if not exists is_founder boolean not null default false;

create or replace function public.set_founder_flag()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.is_founder := new.user_id is not null and exists (
    select 1 from auth.users u join public.founder_emails f on f.email = lower(u.email)
    where u.id = new.user_id);
  return new;
end;
$$;
drop trigger if exists profiles_founder_flag on public.profiles;
create trigger profiles_founder_flag before insert on public.profiles
  for each row execute function public.set_founder_flag();

update public.profiles p set is_founder = true
from auth.users u join public.founder_emails f on f.email = lower(u.email)
where u.id = p.user_id and not p.is_founder;

-- Inbox carries the flag (same as 0008 plus other_is_founder).
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

revoke all on function public.get_inbox() from public, anon;
grant execute on function public.get_inbox() to authenticated;
notify pgrst, 'reload schema';
