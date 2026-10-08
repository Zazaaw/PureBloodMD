-- Rewind (undo the last swipe): free members get 1 per 24 hours, VIP unlimited.
-- Only a pass or a like that did not become a match can be rewound; a Super Like
-- cannot (it would refund the Super Like quota and the target already saw it).

create table public.rewinds (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null,
  created_at  timestamptz not null default now()
);
create index rewinds_profile_idx on public.rewinds (profile_id, created_at desc);
alter table public.rewinds enable row level security;
-- No policies: only the security-definer functions below touch it.

create or replace function public.rewind_quota()
returns table (used int, quota int)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.my_profile_id() as id)
  select (select count(*) from public.rewinds r, me
           where r.profile_id = me.id and r.created_at > now() - interval '24 hours')::int,
         case when public.vip_active((select id from me)) then null else 1 end
$$;

create or replace function public.rewind_last_swipe()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_me    uuid := public.my_profile_id();
  v_swipe public.swipes;
  v_used  int;
  v_quota int;
begin
  if v_me is null then raise exception 'no_profile'; end if;

  select * into v_swipe from public.swipes
  where swiper_id = v_me order by created_at desc limit 1;
  if v_swipe.target_id is null then raise exception 'nothing_to_rewind'; end if;
  if v_swipe.direction = 'super' then raise exception 'cannot_rewind_super'; end if;
  if exists (select 1 from public.matches
             where profile_a = least(v_me, v_swipe.target_id) and profile_b = greatest(v_me, v_swipe.target_id)) then
    raise exception 'already_matched';
  end if;

  select used, quota into v_used, v_quota from public.rewind_quota();
  if v_quota is not null and v_used >= v_quota then raise exception 'rewind_limit'; end if;

  delete from public.swipes where swiper_id = v_me and target_id = v_swipe.target_id;
  insert into public.rewinds (profile_id, target_id) values (v_me, v_swipe.target_id);
  return jsonb_build_object('target_id', v_swipe.target_id, 'direction', v_swipe.direction);
end;
$$;

revoke all on function public.rewind_quota(), public.rewind_last_swipe() from public, anon;
grant execute on function public.rewind_quota(), public.rewind_last_swipe() to authenticated;
