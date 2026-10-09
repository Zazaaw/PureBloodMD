-- 0013: the full admin dashboard (/admin).
--   * Bans: profiles.banned_at/ban_reason. A ban also pauses the profile (hidden everywhere,
--     like deactivated_at) and blocks sign-in (auth.users.banned_until). Members can't undo it.
--   * Reports get a review workflow (status + admin note + reviewer).
--   * admin_actions: an audit log of every moderation action.
--   * Read RPCs for the dashboard (stats, users, user detail, reports, EMR) and write RPCs
--     (ban/unban, badge, report status, delete EMR post, launch switches, admins).
--   Every RPC checks public.is_admin() first.

-- ---------------------------------------------------------------------
-- 1. Columns, audit log
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text check (char_length(ban_reason) <= 500);

alter table public.reports add column if not exists admin_note text check (char_length(admin_note) <= 1000);
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists reviewed_by text;

create table if not exists public.admin_actions (
  id          bigint generated always as identity primary key,
  admin_email text not null,
  action      text not null,
  target_id   uuid,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;

create or replace function public.admin_email()
returns text language sql stable set search_path = ''
as $$ select lower(coalesce(auth.jwt() ->> 'email', 'system')) $$;

create or replace function public.log_admin_action(p_action text, p_target uuid, p_details jsonb default '{}')
returns void language sql security definer set search_path = ''
as $$ insert into public.admin_actions (admin_email, action, target_id, details) values (public.admin_email(), p_action, p_target, coalesce(p_details, '{}')) $$;
revoke execute on function public.log_admin_action(text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = ''
as $$ begin if not public.is_admin() then raise exception 'not_admin'; end if; end $$;

-- Members can't lift a ban by "reactivating".
create or replace function public.set_account_active(p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := public.my_profile_id();
begin
  if v_me is null then raise exception 'no_profile'; end if;
  if p_active and exists (select 1 from public.profiles where id = v_me and banned_at is not null) then
    raise exception 'banned';
  end if;
  update public.profiles
     set deactivated_at = case when p_active then null else coalesce(deactivated_at, now()) end
   where id = v_me;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Read RPCs
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'users',              (select count(*) from public.profiles where not is_bot),
    'new_7d',             (select count(*) from public.profiles where not is_bot and created_at > now() - interval '7 days'),
    'active_24h',         (select count(*) from auth.users u join public.profiles p on p.user_id = u.id where u.last_sign_in_at > now() - interval '24 hours'),
    'verified',           (select count(*) from public.profiles where not is_bot and identity_verified and doctor_verified),
    'pending_verifications', (select count(*) from public.verification_requests where status = 'pending'),
    'open_reports',       (select count(*) from public.reports where status in ('open', 'reviewing')),
    'banned',             (select count(*) from public.profiles where banned_at is not null),
    'paused',             (select count(*) from public.profiles where not is_bot and deactivated_at is not null and banned_at is null),
    'matches_24h',        (select count(*) from public.matches where created_at > now() - interval '24 hours'),
    'messages_24h',       (select count(*) from public.messages m join public.profiles p on p.id = m.sender_id where not p.is_bot and m.created_at > now() - interval '24 hours'),
    'emr_posts_24h',      (select count(*) from public.emr_posts e join public.profiles p on p.id = e.author_id where not p.is_bot and e.created_at > now() - interval '24 hours'),
    'romance',            (select count(*) from public.profiles where not is_bot and intent = 'romance'),
    'connect',            (select count(*) from public.profiles where not is_bot and intent = 'connect'),
    'signups_14d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', (
        select count(*) from public.profiles p where not p.is_bot and p.created_at::date = d::date)) order by d), '[]')
      from generate_series(current_date - 13, current_date, interval '1 day') d)
  );
end;
$$;

create or replace function public.admin_list_users(p_query text default '', p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, display_name text, photo_url text, specialty_title text, hospital text, country text, intent text, gender text,
  email text, created_at timestamptz, last_sign_in_at timestamptz, verified boolean,
  banned_at timestamptz, deactivated_at timestamptz, reports_against int, total bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare q text := '%' || lower(btrim(coalesce(p_query, ''))) || '%';
begin
  perform public.assert_admin();
  return query
  with base as (
    select p.*, u.email::text as email, u.last_sign_in_at,
           (select count(*)::int from public.reports r where r.reported_id = p.id) as reports_against
    from public.profiles p
    left join auth.users u on u.id = p.user_id
    where not p.is_bot
      and (q = '%%' or lower(p.display_name) like q or lower(coalesce(u.email, '')) like q or lower(p.hospital) like q)
  ), filtered as (
    select * from base b
    where case p_filter
      when 'verified'   then b.identity_verified and b.doctor_verified
      when 'unverified' then not (b.identity_verified and b.doctor_verified)
      when 'banned'     then b.banned_at is not null
      when 'reported'   then b.reports_against > 0
      when 'paused'     then b.deactivated_at is not null and b.banned_at is null
      else true end
  )
  select f.id, f.display_name, f.photo_url, f.specialty_title, f.hospital, f.country, f.intent, f.gender,
         f.email, f.created_at, f.last_sign_in_at, f.identity_verified and f.doctor_verified,
         f.banned_at, f.deactivated_at, f.reports_against, count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_user_detail(p_profile uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'profile', to_jsonb(p) - 'replies' - 'opener',
    'email', u.email,
    'email_confirmed_at', u.email_confirmed_at,
    'last_sign_in_at', u.last_sign_in_at,
    'signup_meta', u.raw_user_meta_data,
    'credentials', (select to_jsonb(c) from public.credentials c where c.profile_id = p.id),
    'verifications', (select coalesce(jsonb_agg(to_jsonb(v2) order by v2.created_at desc), '[]') from public.verification_requests v2 where v2.profile_id = p.id),
    'reports_against', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'status', r.status, 'details', r.details,
             'created_at', r.created_at, 'reporter', rp.display_name) order by r.created_at desc), '[]')
      from public.reports r join public.profiles rp on rp.id = r.reporter_id where r.reported_id = p.id),
    'reports_filed', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'status', r.status,
             'created_at', r.created_at, 'reported', rd.display_name) order by r.created_at desc), '[]')
      from public.reports r join public.profiles rd on rd.id = r.reported_id where r.reporter_id = p.id),
    'counts', jsonb_build_object(
      'matches', (select count(*) from public.matches m where p.id in (m.profile_a, m.profile_b)),
      'messages', (select count(*) from public.messages m where m.sender_id = p.id),
      'swipes', (select count(*) from public.swipes s where s.swiper_id = p.id),
      'emr_posts', (select count(*) from public.emr_posts e where e.author_id = p.id and e.deleted_at is null),
      'blocked_by', (select count(*) from public.blocks b where b.blocked_id = p.id)),
    'recent_posts', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'body', e.body, 'images', jsonb_array_length(e.images),
             'created_at', e.created_at, 'parent_id', e.parent_id) order by e.created_at desc), '[]')
      from (select * from public.emr_posts where author_id = p.id and deleted_at is null order by created_at desc limit 10) e),
    'admin_log', (
      select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'admin', a.admin_email, 'details', a.details,
             'created_at', a.created_at) order by a.created_at desc), '[]')
      from public.admin_actions a where a.target_id = p.id)
  ) into v
  from public.profiles p left join auth.users u on u.id = p.user_id
  where p.id = p_profile;
  return v;
end;
$$;

create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  id uuid, status text, reason text, details text, evidence text[], transcript jsonb, admin_note text,
  created_at timestamptz, reviewed_at timestamptz, reviewed_by text, match_id uuid,
  reporter_id uuid, reporter_name text, reporter_photo text,
  reported_id uuid, reported_name text, reported_photo text, reported_email text, reported_is_bot boolean,
  reported_banned_at timestamptz, reports_against int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select r.id, r.status, r.reason, r.details, r.evidence, r.transcript, r.admin_note,
         r.created_at, r.reviewed_at, r.reviewed_by, r.match_id,
         rp.id, rp.display_name, rp.photo_url,
         rd.id, rd.display_name, rd.photo_url, u.email::text, rd.is_bot,
         rd.banned_at, (select count(*)::int from public.reports x where x.reported_id = rd.id)
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  join public.profiles rd on rd.id = r.reported_id
  left join auth.users u on u.id = rd.user_id
  where case when p_status = 'open' then r.status in ('open', 'reviewing') else r.status = p_status end
  order by r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_list_emr(p_limit int default 100)
returns table (id uuid, body text, images jsonb, parent_id uuid, like_count int, reply_count int, created_at timestamptz,
               author_id uuid, author_name text, author_photo text, author_is_bot boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select e.id, e.body, e.images, e.parent_id, e.like_count, e.reply_count, e.created_at,
         p.id, p.display_name, p.photo_url, p.is_bot
  from public.emr_posts e join public.profiles p on p.id = e.author_id
  where e.deleted_at is null
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 300);
end;
$$;

create or replace function public.admin_list_admins()
returns table (email text, is_me boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query select a.email, a.email = public.admin_email() from public.admin_emails a order by a.email;
end;
$$;

create or replace function public.admin_audit_log(p_limit int default 100)
returns table (id bigint, admin_email text, action text, target_id uuid, target_name text, details jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select a.id, a.admin_email, a.action, a.target_id, p.display_name, a.details, a.created_at
  from public.admin_actions a left join public.profiles p on p.id = a.target_id
  order by a.created_at desc limit least(greatest(p_limit, 1), 500);
end;
$$;

create or replace function public.admin_get_config()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return (select jsonb_object_agg(key, value) from public.app_config);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Write RPCs
-- ---------------------------------------------------------------------
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
  update auth.users set banned_until = 'infinity' where id = v.user_id returning email into v_email;
  -- Close every open report about them: the ban is the action.
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

create or replace function public.admin_unban_user(p_profile uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v public.profiles;
begin
  perform public.assert_admin();
  select * into v from public.profiles where id = p_profile;
  if v.id is null then raise exception 'not_found'; end if;
  update public.profiles set banned_at = null, ban_reason = null, deactivated_at = null where id = p_profile;
  update auth.users set banned_until = null where id = v.user_id;
  perform public.log_admin_action('unban', p_profile);
end;
$$;

create or replace function public.admin_set_verified(p_profile uuid, p_verified boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.profiles
     set identity_verified = p_verified, doctor_verified = p_verified,
         verified_at = case when p_verified then coalesce(verified_at, now()) else null end
   where id = p_profile and not is_bot;
  if not found then raise exception 'not_found'; end if;
  perform public.log_admin_action(case when p_verified then 'grant_badge' else 'revoke_badge' end, p_profile);
end;
$$;

create or replace function public.admin_update_report(p_report uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_target uuid;
begin
  perform public.assert_admin();
  if p_status not in ('open', 'reviewing', 'actioned', 'dismissed') then raise exception 'bad_status'; end if;
  update public.reports
     set status = p_status, admin_note = coalesce(nullif(left(btrim(coalesce(p_note, '')), 1000), ''), admin_note),
         reviewed_at = now(), reviewed_by = public.admin_email()
   where id = p_report
   returning reported_id into v_target;
  if v_target is null then raise exception 'not_found'; end if;
  perform public.log_admin_action('report_' || p_status, v_target, jsonb_build_object('report', p_report, 'note', p_note));
end;
$$;

create or replace function public.admin_delete_emr_post(p_post uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v public.emr_posts;
begin
  perform public.assert_admin();
  select * into v from public.emr_posts where id = p_post;
  if v.id is null then raise exception 'not_found'; end if;
  perform public.trash_emr_media(v.images);
  if exists (select 1 from public.emr_posts where parent_id = p_post) then
    update public.emr_posts set deleted_at = now(), body = '', images = '[]' where id = p_post;
  else
    delete from public.emr_posts where id = p_post;
  end if;
  perform public.log_admin_action('delete_emr_post', v.author_id, jsonb_build_object('post', p_post, 'body', left(v.body, 200), 'reason', p_reason));
end;
$$;

create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_key = 'vip_enabled' and jsonb_typeof(p_value) <> 'boolean' then raise exception 'bad_value'; end if;
  if p_key = 'daily_swipe_limit' and (jsonb_typeof(p_value) <> 'number' or (p_value)::text::int not between 1 and 1000) then raise exception 'bad_value'; end if;
  if p_key = 'active_countries' and (jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) = 0) then raise exception 'bad_value'; end if;
  if p_key not in ('vip_enabled', 'daily_swipe_limit', 'active_countries') then raise exception 'bad_key'; end if;
  insert into public.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.log_admin_action('config', null, jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

create or replace function public.admin_set_admin(p_email text, p_add boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.assert_admin();
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad_email'; end if;
  if p_add then
    insert into public.admin_emails (email) values (v_email) on conflict do nothing;
  else
    if v_email = public.admin_email() then raise exception 'cannot_remove_self'; end if;
    delete from public.admin_emails where email = v_email;
  end if;
  perform public.log_admin_action(case when p_add then 'add_admin' else 'remove_admin' end, null, jsonb_build_object('email', v_email));
end;
$$;

-- Verification reviews are audited too.
create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_profile uuid;
begin
  perform public.assert_admin();
  if not p_approve and coalesce(btrim(p_note), '') = '' then raise exception 'note_required'; end if;
  update public.verification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewer_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
   where id = p_id and status = 'pending'
   returning profile_id into v_profile;
  if v_profile is null then raise exception 'not_pending'; end if;
  perform public.log_admin_action(case when p_approve then 'approve_verification' else 'reject_verification' end, v_profile,
    jsonb_build_object('note', p_note));
end;
$$;

-- Admins can open EMR photos and report evidence (0010 covered verification docs + evidence).
drop policy if exists "admins read emr media" on storage.objects;
create policy "admins read emr media" on storage.objects for select to authenticated
  using (bucket_id = 'emr-media' and public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Permissions
-- ---------------------------------------------------------------------
revoke all on function
  public.admin_stats(), public.admin_list_users(text, text, int, int), public.admin_user_detail(uuid),
  public.admin_list_reports(text), public.admin_list_emr(int), public.admin_list_admins(), public.admin_audit_log(int),
  public.admin_get_config(), public.admin_ban_user(uuid, text), public.admin_unban_user(uuid),
  public.admin_set_verified(uuid, boolean), public.admin_update_report(uuid, text, text),
  public.admin_delete_emr_post(uuid, text), public.admin_set_config(text, jsonb), public.admin_set_admin(text, boolean),
  public.assert_admin(), public.admin_email()
from public, anon;
grant execute on function
  public.admin_stats(), public.admin_list_users(text, text, int, int), public.admin_user_detail(uuid),
  public.admin_list_reports(text), public.admin_list_emr(int), public.admin_list_admins(), public.admin_audit_log(int),
  public.admin_get_config(), public.admin_ban_user(uuid, text), public.admin_unban_user(uuid),
  public.admin_set_verified(uuid, boolean), public.admin_update_report(uuid, text, text),
  public.admin_delete_emr_post(uuid, text), public.admin_set_config(text, jsonb), public.admin_set_admin(text, boolean),
  public.assert_admin(), public.admin_email()
to authenticated;

notify pgrst, 'reload schema';
