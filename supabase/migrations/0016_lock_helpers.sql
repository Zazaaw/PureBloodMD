-- 0016: go-live hardening of helper functions.
--   * is_blocked_pair(a, b) told anyone whether doctor A blocked doctor B. Members now ask
--     only about themselves via is_blocked_with(other); the pair version stays internal.
--   * Signed-out visitors can't call member-only helpers at all.

create or replace function public.is_blocked_with(p_other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_blocked_pair(public.my_profile_id(), p_other) $$;

revoke execute on function public.is_blocked_pair(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

revoke execute on function
  public.delete_emr_post(uuid), public.toggle_emr_like(uuid), public.emr_visible(uuid),
  public.can_read_emr_media(text), public.can_access_chat_media(text), public.is_match_member(uuid),
  public.my_profile_id()
from public, anon;
grant execute on function
  public.delete_emr_post(uuid), public.toggle_emr_like(uuid), public.emr_visible(uuid),
  public.can_read_emr_media(text), public.can_access_chat_media(text), public.is_match_member(uuid),
  public.my_profile_id()
to authenticated;

notify pgrst, 'reload schema';
