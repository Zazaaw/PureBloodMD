-- One-off, run on 2026-10-09 before go-live: remove every demo (bot) doctor.
-- Cascades remove their swipes, matches, messages, EMR posts/likes, locations and notifications.
-- Real members are untouched. To bring demo doctors back: `npm run db:seed` (seed JSON stays in the repo).
-- Storage photos under avatars/bots/ are kept (the landing page still uses some of them).
begin;
delete from public.profiles where is_bot;
commit;
select
  (select count(*) from public.profiles where is_bot)     as bots_left,
  (select count(*) from public.profiles where not is_bot) as members,
  (select count(*) from public.emr_posts)                 as emr_posts_left,
  (select count(*) from public.matches)                   as matches_left;
