-- 0019: founders get every VIP perk, unlimited, even while the VIP program is off.
--   * vip_active() is the one gate used by the swipe, rewind and bubble limits.
--   * Super Likes: founders have no daily cap (quota null = unlimited; swipe_profile
--     only raises when used >= quota, which is never true against null).

create or replace function public.vip_active(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_profile and p.is_founder)
    or (public.vip_program_enabled() and exists (
      select 1 from public.subscriptions s
      where s.profile_id = p_profile and public.subscription_period_end(s) > now()
    ))
$$;

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
         case
           when exists (select 1 from public.profiles p, me where p.id = me.id and p.is_founder) then null
           when public.vip_active((select id from me)) then 5
           else 1
         end,
         (select min(created_at) + interval '24 hours' from recent)
$$;
