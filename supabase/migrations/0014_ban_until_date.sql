-- 0014: ban sign-in with a real date. GoTrue can't parse banned_until = 'infinity'
-- ("Database error querying schema"); a far-future date gives the proper "User is banned".
update auth.users set banned_until = '2999-12-31 00:00:00+00' where banned_until = 'infinity';

create or replace function public.admin_ban_user(p_profile uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v public.profiles; v_email text;
begin
  perform public.assert_admin();
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  select * into v from public.profiles where id = p_profile;
  if v.id is null or v.is_bot then raise exception 'not_found'; end if;
  update public.profiles
     set banned_at = now(), ban_reason = left(btrim(p_reason), 500), deactivated_at = coalesce(deactivated_at, now())
   where id = p_profile;
  update auth.users set banned_until = '2999-12-31 00:00:00+00' where id = v.user_id returning email into v_email;
  update public.reports set status = 'actioned', reviewed_at = now(), reviewed_by = public.admin_email(),
         admin_note = coalesce(admin_note, 'Account banned: ' || left(btrim(p_reason), 200))
   where reported_id = p_profile and status in ('open', 'reviewing');
  perform public.log_admin_action('ban', p_profile, jsonb_build_object('reason', p_reason));
  begin
    perform public.send_template_email(v_email, 'account_banned', jsonb_build_object('name', v.display_name, 'reason', btrim(p_reason)));
  exception when others then null;
  end;
end;
$$;
