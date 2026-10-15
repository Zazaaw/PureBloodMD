-- 0024: anyone can write first. The female-first (Bumble) rule is gone; the UI shows
-- "Your move" when the other doctor wrote last and you haven't replied yet.
-- Everything else in enforce_message_rules is unchanged from 0009.

create or replace function public.enforce_message_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sender  public.profiles;
  v_other   public.profiles;
  v_match   public.matches;
begin
  select * into v_sender from public.profiles where id = new.sender_id;
  select * into v_match from public.matches where id = new.match_id;
  if v_match.id is null or public.consult_flatlined(v_match) then
    raise exception 'consult_expired';
  end if;

  if v_sender.is_bot then
    new.image_path := null;
    return new;
  end if;

  select * into v_other from public.profiles
    where id = case when v_match.profile_a = new.sender_id then v_match.profile_b else v_match.profile_a end;

  if v_sender.deactivated_at is not null or v_other.deactivated_at is not null then
    raise exception 'account_paused';
  end if;
  if public.is_blocked_pair(v_sender.id, v_other.id) then raise exception 'blocked'; end if;
  if new.image_path is not null and new.image_path not like new.match_id::text || '/%' then
    raise exception 'bad_image';
  end if;
  if public.vip_program_enabled() and v_match.bubble_count >= 10 and not public.vip_active(v_sender.id) then
    raise exception 'quota_exhausted' using hint = 'Upgrade to VIP to keep chatting.';
  end if;

  new.body := public.mask_contact_info(btrim(new.body));
  new.created_at := now();
  return new;
end;
$$;
