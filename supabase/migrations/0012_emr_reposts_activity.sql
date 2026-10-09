-- 0012: EMR reposts + activity notifications (the heart in the top-right corner).
--   * emr_reposts: a doctor re-shares a post; it shows on their profile under "Reposts".
--   * emr_notifications: written by triggers when someone likes, replies to or reposts
--     your post. Unliking / un-reposting removes the notification again.
--   * Realtime on emr_notifications, so the heart badge updates live.

-- ---------------------------------------------------------------------
-- 1. Reposts
-- ---------------------------------------------------------------------
alter table public.emr_posts add column if not exists repost_count int not null default 0;

create table if not exists public.emr_reposts (
  post_id     uuid not null references public.emr_posts (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index if not exists emr_reposts_profile_idx on public.emr_reposts (profile_id, created_at desc);
alter table public.emr_reposts enable row level security;
drop policy if exists "read visible reposts" on public.emr_reposts;
create policy "read visible reposts" on public.emr_reposts for select to authenticated
  using (public.emr_visible(profile_id));
revoke insert, update, delete on public.emr_reposts from authenticated;

create or replace function public.toggle_emr_repost(p_post uuid)
returns table (reposted boolean, repost_count int)
language plpgsql security definer set search_path = ''
as $$
declare
  v_me   uuid := public.my_profile_id();
  v_post public.emr_posts;
begin
  if v_me is null then raise exception 'no_profile'; end if;
  select * into v_post from public.emr_posts where id = p_post;
  if v_post.id is null or v_post.deleted_at is not null or not public.emr_visible(v_post.author_id) then
    raise exception 'not_found';
  end if;
  if v_post.author_id = v_me then raise exception 'own_post'; end if;

  delete from public.emr_reposts where post_id = p_post and profile_id = v_me;
  if found then
    update public.emr_posts set repost_count = greatest(emr_posts.repost_count - 1, 0) where id = p_post
      returning false, emr_posts.repost_count into reposted, repost_count;
  else
    insert into public.emr_reposts (post_id, profile_id) values (p_post, v_me);
    update public.emr_posts set repost_count = emr_posts.repost_count + 1 where id = p_post
      returning true, emr_posts.repost_count into reposted, repost_count;
  end if;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Notifications
-- ---------------------------------------------------------------------
create table if not exists public.emr_notifications (
  id            bigint generated always as identity primary key,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  actor_id      uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('like', 'reply', 'repost')),
  post_id       uuid not null references public.emr_posts (id) on delete cascade,  -- the post that was liked / replied to / reposted
  reply_id      uuid references public.emr_posts (id) on delete cascade,           -- the new reply (kind = 'reply')
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists emr_notifications_inbox_idx on public.emr_notifications (recipient_id, created_at desc);
create unique index if not exists emr_notifications_once_idx
  on public.emr_notifications (recipient_id, actor_id, kind, post_id) where kind in ('like', 'repost');

alter table public.emr_notifications enable row level security;
drop policy if exists "read my emr notifications" on public.emr_notifications;
create policy "read my emr notifications" on public.emr_notifications for select to authenticated
  using (recipient_id = public.my_profile_id() and public.emr_visible(actor_id));
revoke insert, update, delete on public.emr_notifications from authenticated;

-- Shared writer: skips self-actions and bot recipients (nobody to notify).
create or replace function public.notify_emr(p_recipient uuid, p_actor uuid, p_kind text, p_post uuid, p_reply uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if (select is_bot from public.profiles where id = p_recipient) then return; end if;
  if p_kind = 'reply' then
    insert into public.emr_notifications (recipient_id, actor_id, kind, post_id, reply_id)
    values (p_recipient, p_actor, p_kind, p_post, p_reply);
  else
    insert into public.emr_notifications (recipient_id, actor_id, kind, post_id)
    values (p_recipient, p_actor, p_kind, p_post)
    on conflict (recipient_id, actor_id, kind, post_id) where kind in ('like', 'repost')
    do update set created_at = now(), read_at = null;
  end if;
end;
$$;
revoke execute on function public.notify_emr(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.emr_like_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_emr((select author_id from public.emr_posts where id = new.post_id), new.profile_id, 'like', new.post_id);
  else
    delete from public.emr_notifications where kind = 'like' and actor_id = old.profile_id and post_id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists emr_likes_notify on public.emr_likes;
create trigger emr_likes_notify after insert or delete on public.emr_likes
  for each row execute function public.emr_like_notify();

create or replace function public.emr_repost_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_emr((select author_id from public.emr_posts where id = new.post_id), new.profile_id, 'repost', new.post_id);
  else
    delete from public.emr_notifications where kind = 'repost' and actor_id = old.profile_id and post_id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists emr_reposts_notify on public.emr_reposts;
create trigger emr_reposts_notify after insert or delete on public.emr_reposts
  for each row execute function public.emr_repost_notify();

create or replace function public.emr_reply_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.parent_id is not null then
    perform public.notify_emr((select author_id from public.emr_posts where id = new.parent_id), new.author_id, 'reply', new.parent_id, new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists emr_posts_reply_notify on public.emr_posts;
create trigger emr_posts_reply_notify after insert on public.emr_posts
  for each row execute function public.emr_reply_notify();

create or replace function public.emr_unread_count()
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.emr_notifications n
  where n.recipient_id = public.my_profile_id() and n.read_at is null and public.emr_visible(n.actor_id)
$$;

create or replace function public.mark_emr_notifications_read()
returns void
language sql security definer set search_path = ''
as $$
  update public.emr_notifications set read_at = now()
  where recipient_id = public.my_profile_id() and read_at is null
$$;

-- Live badge.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'emr_notifications') then
    alter publication supabase_realtime add table public.emr_notifications;
  end if;
end $$;

revoke all on function public.toggle_emr_repost(uuid), public.emr_unread_count(), public.mark_emr_notifications_read() from public, anon;
grant execute on function public.toggle_emr_repost(uuid), public.emr_unread_count(), public.mark_emr_notifications_read() to authenticated;

notify pgrst, 'reload schema';
