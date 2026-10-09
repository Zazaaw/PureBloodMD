-- 0011: EMR (Electronic Medical Record), a Threads-style feed for members.
--   * emr_posts holds threads, comments and replies in one table:
--     a thread has no parent; a comment's parent is the thread; a reply's parent is a comment.
--     root_id always points at the thread, so a whole conversation is one index scan.
--   * Up to 4 photos per post in the PRIVATE emr-media bucket (<profile_id>/<uuid>.jpg),
--     read through signed URLs. Blocked pairs never see each other's posts or photos.
--   * Same masking as chat: phone numbers and chat-app links are hidden server-side.
--   * Delete: a post without replies is removed; one with replies becomes a tombstone
--     so the conversation under it stays readable.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.emr_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  parent_id    uuid references public.emr_posts (id) on delete cascade,
  root_id      uuid references public.emr_posts (id) on delete cascade,
  body         text not null default '' check (char_length(body) <= 500),
  -- [{ "path": "<profile_id>/<uuid>.jpg", "w": 1200, "h": 900 }]
  images       jsonb not null default '[]' check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 4),
  reply_count  int not null default 0,
  like_count   int not null default 0,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  check (deleted_at is not null or char_length(btrim(body)) >= 1 or jsonb_array_length(images) >= 1)
);
create index if not exists emr_posts_feed_idx on public.emr_posts (created_at desc) where parent_id is null and deleted_at is null;
create index if not exists emr_posts_author_idx on public.emr_posts (author_id, created_at desc);
create index if not exists emr_posts_parent_idx on public.emr_posts (parent_id, created_at);
create index if not exists emr_posts_root_idx on public.emr_posts (root_id);

create table if not exists public.emr_likes (
  post_id     uuid not null references public.emr_posts (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index if not exists emr_likes_profile_idx on public.emr_likes (profile_id);

-- ---------------------------------------------------------------------
-- 2. Visibility + row level security
-- ---------------------------------------------------------------------
-- You always see yourself. Others: not blocked either way, and not paused.
create or replace function public.emr_visible(p_author uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_author = public.my_profile_id()
      or (
        not public.is_blocked_pair(public.my_profile_id(), p_author)
        and exists (select 1 from public.profiles where id = p_author and deactivated_at is null)
      )
$$;

alter table public.emr_posts enable row level security;
alter table public.emr_likes enable row level security;

drop policy if exists "read visible emr posts" on public.emr_posts;
create policy "read visible emr posts" on public.emr_posts for select to authenticated
  using (public.emr_visible(author_id));

drop policy if exists "post as myself" on public.emr_posts;
create policy "post as myself" on public.emr_posts for insert to authenticated
  with check (author_id = public.my_profile_id());

-- Members only choose what they write; the trigger fills in everything else.
-- No update/delete policies: edits go through delete_emr_post / toggle_emr_like.
revoke insert, update, delete on public.emr_posts from authenticated;
grant insert (body, images, parent_id) on public.emr_posts to authenticated;

drop policy if exists "read own emr likes" on public.emr_likes;
create policy "read own emr likes" on public.emr_likes for select to authenticated
  using (profile_id = public.my_profile_id());
revoke insert, update, delete on public.emr_likes from authenticated;

-- ---------------------------------------------------------------------
-- 3. Posting rules
-- ---------------------------------------------------------------------
create or replace function public.enforce_emr_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_me     uuid := public.my_profile_id();
  v_parent public.emr_posts;
  v_img    jsonb;
  v_images jsonb := '[]';
  v_path   text;
begin
  -- Signed-in members: force authorship and server-owned columns.
  -- No auth.uid() means service role or a migration (bot seed), which is trusted.
  if auth.uid() is not null then
    if v_me is null then raise exception 'no_profile'; end if;
    if exists (select 1 from public.profiles where id = v_me and deactivated_at is not null) then
      raise exception 'account_paused';
    end if;
    if (select count(*) from public.emr_posts where author_id = v_me and created_at > now() - interval '1 hour') >= 60 then
      raise exception 'slow_down';
    end if;
    new.author_id := v_me;
    new.created_at := now();
  end if;
  new.reply_count := 0;
  new.like_count := 0;
  new.deleted_at := null;
  new.body := public.mask_contact_info(btrim(coalesce(new.body, '')));

  -- Photos: own folder only, sane dimensions, nothing but path/w/h kept.
  for v_img in select value from jsonb_array_elements(coalesce(new.images, '[]')) loop
    v_path := v_img->>'path';
    if jsonb_typeof(v_img) <> 'object' or v_path is null
       or v_path not like new.author_id::text || '/%' or v_path like '%..%' then
      raise exception 'bad_image';
    end if;
    if coalesce((v_img->>'w')::int, 0) not between 1 and 10000 or coalesce((v_img->>'h')::int, 0) not between 1 and 10000 then
      raise exception 'bad_image';
    end if;
    v_images := v_images || jsonb_build_array(jsonb_build_object('path', v_path, 'w', (v_img->>'w')::int, 'h', (v_img->>'h')::int));
  end loop;
  new.images := v_images;

  if char_length(new.body) = 0 and jsonb_array_length(new.images) = 0 then
    raise exception 'empty_post';
  end if;

  if new.parent_id is null then
    new.root_id := null;
  else
    select * into v_parent from public.emr_posts where id = new.parent_id;
    if v_parent.id is null or v_parent.deleted_at is not null then raise exception 'cannot_reply'; end if;
    if public.is_blocked_pair(new.author_id, v_parent.author_id) then raise exception 'cannot_reply'; end if;
    new.root_id := coalesce(v_parent.root_id, v_parent.id);
  end if;
  return new;
end;
$$;

drop trigger if exists emr_posts_rules on public.emr_posts;
create trigger emr_posts_rules before insert on public.emr_posts
  for each row execute function public.enforce_emr_post();

-- Direct replies only: a thread shows its comments, a comment shows its replies.
create or replace function public.count_emr_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.emr_posts set reply_count = reply_count + 1 where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update public.emr_posts set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
  end if;
  return null;
end;
$$;

drop trigger if exists emr_posts_count on public.emr_posts;
create trigger emr_posts_count after insert or delete on public.emr_posts
  for each row execute function public.count_emr_reply();

-- Removed photos are cleaned out of Storage by `npm run db:cleanup`.
create or replace function public.trash_emr_media(p_images jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.media_trash (path)
  select 'emr-media/' || (value->>'path') from jsonb_array_elements(coalesce(p_images, '[]'))
  on conflict do nothing
$$;
revoke execute on function public.trash_emr_media(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. RPCs
-- ---------------------------------------------------------------------
create or replace function public.delete_emr_post(p_post uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_post public.emr_posts;
begin
  select * into v_post from public.emr_posts where id = p_post;
  if v_post.id is null or v_post.author_id is distinct from public.my_profile_id() then
    raise exception 'not_yours';
  end if;
  perform public.trash_emr_media(v_post.images);
  if exists (select 1 from public.emr_posts where parent_id = p_post) then
    update public.emr_posts set deleted_at = now(), body = '', images = '[]' where id = p_post;
  else
    delete from public.emr_posts where id = p_post;
  end if;
end;
$$;

create or replace function public.toggle_emr_like(p_post uuid)
returns table (liked boolean, like_count int)
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

  delete from public.emr_likes where post_id = p_post and profile_id = v_me;
  if found then
    update public.emr_posts set like_count = greatest(emr_posts.like_count - 1, 0) where id = p_post
      returning false, emr_posts.like_count into liked, like_count;
  else
    insert into public.emr_likes (post_id, profile_id) values (p_post, v_me);
    update public.emr_posts set like_count = emr_posts.like_count + 1 where id = p_post
      returning true, emr_posts.like_count into liked, like_count;
  end if;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Storage: private bucket, own folder for uploads, visibility for reads
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('emr-media', 'emr-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create or replace function public.can_read_emr_media(p_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare v_author uuid;
begin
  begin
    v_author := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.emr_visible(v_author);
end;
$$;

drop policy if exists "emr media read" on storage.objects;
create policy "emr media read" on storage.objects for select to authenticated
  using (bucket_id = 'emr-media' and public.can_read_emr_media(name));
drop policy if exists "emr media upload own folder" on storage.objects;
create policy "emr media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'emr-media' and (storage.foldername(name))[1] = public.my_profile_id()::text);

-- ---------------------------------------------------------------------
-- 6. Demo threads from bot doctors, so the feed is never empty.
--    Runs once (only while there are no posts); `npm run db:seed` calls it too.
-- ---------------------------------------------------------------------
create or replace function public.seed_emr_bot_posts()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_bots uuid[];
  v_post uuid;
  v_at   timestamptz;
  v_n    int := 0;
  v_threads text[] := array[
    'Morning report: patient presented with chest pain. Turned out to be heartbreak. Discharged with ice cream and a referral to Psychiatry.',
    'Day 3 of my night shift block. I have started greeting the vending machine by name. His name is Kevin. He understands me.',
    'Unpopular opinion: hospital cafeteria nasi goreng at 3 AM is a Michelin-star experience.',
    'Wrote "illegible" on a prescription to test the pharmacy. They dispensed amoxicillin. Respect.',
    'Me: I will sleep early tonight. Also me, at 01:47: reading UpToDate about a disease I will never see.',
    'Grand rounds tip: if you say "the literature is mixed" with confidence, nobody asks follow-up questions.',
    'Consultant asked what the plan was. I said "observation". He said "of what". I said "of you, sir, learning from the best". Survived.',
    'Patient asked if I was old enough to be a doctor. I am 31, have 4 grey hairs and a mortgage. Thank you though.',
    'Signed my name 214 times today. My signature is now a straight line with a tiny hill. Medicolegally speaking, it is art.',
    'Koas life: carried 3 status files, 2 coffees and 1 existential crisis up 6 floors because the lift was "for patients only".',
    'Today I explained to a patient that "kerokan" does not treat appendicitis. We compromised. He let me do the surgery.',
    'If you hear me say "this is a simple case", please leave the room. Something is about to go very wrong.',
    'Post-call brain: tried to scan my house key at the hospital gate. Then tried to badge into my own kitchen.',
    'Dear colleagues who write "pasien tampak sakit sedang" on every patient: what does sakit berat look like to you. Asking for my file.',
    'Finally cleared my inbox. Then the pager went off. Then the inbox refilled. Medicine is a renewable energy source.',
    'Looking for a referral buddy in Surabaya who replies faster than the lab. The bar is very low. Please apply.'
  ];
  v_replies text[] := array[
    'This is the most accurate thing I have read all week 😂',
    'Saving this for the next morning report. Will credit you. Probably.',
    'Felt this in my soul and also in my lower back.',
    'Kevin the vending machine is a better listener than most consultants, honestly.',
    'Can confirm. Source: am also post-call.',
    'The literature on this is mixed. 🫡',
    'Please write a textbook. I will read it at 3 AM.',
    'This is why I chose Dermatology. We sleep.',
    'Sending this to my whole residency group immediately.',
    'Clinically relatable. Socially concerning. 10/10.'
  ];
begin
  if exists (select 1 from public.emr_posts) then return 0; end if;
  select array_agg(id) into v_bots
  from (select id from public.profiles where is_bot and deactivated_at is null order by random() limit 40) b;
  if v_bots is null then return 0; end if;

  for i in 1..cardinality(v_threads) loop
    v_at := now() - (i * interval '5 hours') - random() * interval '3 hours';
    insert into public.emr_posts (author_id, body, created_at)
    values (v_bots[1 + (i - 1) % cardinality(v_bots)], v_threads[i], v_at)
    returning id into v_post;
    v_n := v_n + 1;
    for j in 1..floor(random() * 4)::int loop
      insert into public.emr_posts (author_id, parent_id, body, created_at)
      values (
        v_bots[1 + (i * 7 + j) % cardinality(v_bots)],
        v_post,
        v_replies[1 + floor(random() * cardinality(v_replies))::int],
        v_at + j * interval '20 minutes'
      );
    end loop;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.seed_emr_bot_posts() from public, anon, authenticated;

select public.seed_emr_bot_posts();
