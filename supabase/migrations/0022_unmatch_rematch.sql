-- 0022: unmatching no longer hides the pair forever. Both swipes are cleared, like
-- asystole, so they can show up in each other's triage again and match again later.
-- Block stays the permanent "never show me this person".

create or replace function public.unmatch_consult(p_match uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if not public.is_match_member(p_match) then raise exception 'not_member'; end if;
  select profile_a, profile_b into v_a, v_b from public.matches where id = p_match;
  delete from public.matches where id = p_match;
  delete from public.swipes
  where (swiper_id = v_a and target_id = v_b) or (swiper_id = v_b and target_id = v_a);
end;
$$;

-- Pairs unmatched before this change: both liked each other but no match exists.
-- A mutual like always creates a match, so these can only come from an old unmatch.
delete from public.swipes s
using public.swipes back
where back.swiper_id = s.target_id and back.target_id = s.swiper_id
  and s.direction in ('right', 'super') and back.direction in ('right', 'super')
  and not exists (
    select 1 from public.matches m
    where m.profile_a = least(s.swiper_id, s.target_id) and m.profile_b = greatest(s.swiper_id, s.target_id)
  );
