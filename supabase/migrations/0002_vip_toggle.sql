-- =====================================================================
-- PureBloodMD 0002: let a doctor turn VIP off again (demo, no payment).
-- Run in the Supabase SQL Editor after 0001_init.sql.
-- is_vip stays non-updatable by users; only these functions flip it.
-- =====================================================================
create or replace function public.deactivate_vip_demo()
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles set is_vip = false where user_id = auth.uid()
$$;

revoke all on function public.deactivate_vip_demo() from public, anon;
grant execute on function public.deactivate_vip_demo() to authenticated;
