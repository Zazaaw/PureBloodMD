-- 0021: every member gets 5 Super Likes a day (was 1, 5 for VIP). Founders stay unlimited.
-- Super Like is button-only now; the swipe-up gesture fired it by accident while scrolling.
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
         case when exists (select 1 from public.profiles p, me where p.id = me.id and p.is_founder) then null else 5 end,
         (select min(created_at) + interval '24 hours' from recent)
$$;
