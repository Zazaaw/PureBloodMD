-- 0017 enabled RLS on consult_hides without a read policy, so the messages policy
-- could not see the member's own hide row and old messages stayed visible.
-- Members may read only their own hide markers; writes still go through hide_consult().
drop policy if exists "read own consult hides" on public.consult_hides;
create policy "read own consult hides" on public.consult_hides for select to authenticated
  using (profile_id = public.my_profile_id());
