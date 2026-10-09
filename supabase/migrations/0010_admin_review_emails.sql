-- 0010: developer review dashboard + transactional emails for verification.
--   * admin_emails: who may open /admin (checked against the signed-in JWT email).
--   * Admins can read verification documents and report evidence, list requests and approve / reject.
--   * Emails go out from the database (pg_net -> Resend), so the web app needs no extra secrets:
--       submitted -> "being evaluated, up to 3 days"; approved -> "you're verified"; rejected -> note.
--     The Resend key lives in Vault ('resend_api_key'); templates live in email_templates.
--     Both are written by `npm run supabase:push -- email` from .env.local and supabase/templates/.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Admins
-- ---------------------------------------------------------------------
create table if not exists public.admin_emails (email text primary key check (email = lower(email)));
alter table public.admin_emails enable row level security;
insert into public.admin_emails (email) values ('faizandhilmi@gmail.com'), ('sonyasyahirah@gmail.com')
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_emails where email = lower(coalesce(auth.jwt() ->> 'email', ''))) $$;

drop policy if exists "admins read verification docs" on storage.objects;
create policy "admins read verification docs" on storage.objects for select to authenticated
  using (bucket_id in ('verification-docs', 'report-evidence') and public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Review RPCs
-- ---------------------------------------------------------------------
create or replace function public.admin_list_verifications(p_status text default 'pending')
returns table (
  id uuid, status text, created_at timestamptz, reviewed_at timestamptz, reviewer_note text,
  id_doc_path text, selfie_path text, license_path text,
  profile_id uuid, display_name text, photo_url text, specialty_title text, hospital text, email text,
  str_number text, alma_mater text, class_year int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
  select v.id, v.status, v.created_at, v.reviewed_at, v.reviewer_note,
         v.id_doc_path, v.selfie_path, v.license_path,
         p.id, p.display_name, p.photo_url, p.specialty_title, p.hospital, u.email::text,
         c.str_number, c.alma_mater, c.class_year
  from public.verification_requests v
  join public.profiles p on p.id = v.profile_id
  left join auth.users u on u.id = p.user_id
  left join public.credentials c on c.profile_id = p.id
  where v.status = p_status
  order by case when p_status = 'pending' then v.created_at end asc, v.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if not p_approve and coalesce(btrim(p_note), '') = '' then raise exception 'note_required'; end if;
  update public.verification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewer_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_pending'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Transactional email from the database
-- ---------------------------------------------------------------------
create table if not exists public.email_templates (
  key        text primary key,
  subject    text not null,
  html       text not null,
  updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;

insert into public.app_config (key, value) values ('email_from', '"PureBloodMD <no-reply@p441z.my.id>"'), ('site_url', '"https://purebloodmd.p441z.my.id"')
on conflict (key) do nothing;

-- Renders a template ({{name}} placeholders) and queues it with Resend through pg_net.
create or replace function public.send_template_email(p_to text, p_key text, p_vars jsonb default '{}')
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  t public.email_templates;
  v_key text;
  v_subject text;
  v_html text;
  k text;
  v text;
begin
  if p_to is null then return null; end if;
  select * into t from public.email_templates where key = p_key;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key';
  if t.key is null or v_key is null then
    raise warning 'email % not sent: template or resend_api_key missing', p_key;
    return null;
  end if;
  v_subject := t.subject;
  v_html := t.html;
  p_vars := p_vars || jsonb_build_object('site', (select value #>> '{}' from public.app_config where key = 'site_url'));
  for k, v in select * from jsonb_each_text(p_vars) loop
    v_subject := replace(v_subject, '{{' || k || '}}', coalesce(v, ''));
    v_html := replace(v_html, '{{' || k || '}}', coalesce(v, ''));
  end loop;
  return net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', (select value #>> '{}' from public.app_config where key = 'email_from'),
      'to', jsonb_build_array(p_to),
      'subject', v_subject,
      'html', v_html)
  );
end;
$$;

create or replace function public.verification_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_name text;
begin
  select u.email, p.display_name into v_email, v_name
  from public.profiles p join auth.users u on u.id = p.user_id
  where p.id = new.profile_id;

  if tg_op = 'INSERT' then
    perform public.send_template_email(v_email, 'verification_received', jsonb_build_object('name', v_name));
  elsif new.status <> old.status and new.status = 'approved' then
    perform public.send_template_email(v_email, 'verification_approved', jsonb_build_object('name', v_name));
  elsif new.status <> old.status and new.status = 'rejected' then
    perform public.send_template_email(v_email, 'verification_rejected',
      jsonb_build_object('name', v_name, 'note', coalesce(new.reviewer_note, 'One of the documents was hard to read.')));
  end if;
  return null;
exception when others then
  -- Never block a submission or review because an email failed.
  raise warning 'verification email failed: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists verification_email on public.verification_requests;
create trigger verification_email after insert or update of status on public.verification_requests
  for each row execute function public.verification_email();

-- ---------------------------------------------------------------------
-- 4. Permissions
-- ---------------------------------------------------------------------
revoke all on function public.is_admin(), public.admin_list_verifications(text), public.admin_review_verification(uuid, boolean, text),
  public.send_template_email(text, text, jsonb) from public, anon;
grant execute on function public.is_admin(), public.admin_list_verifications(text), public.admin_review_verification(uuid, boolean, text)
  to authenticated;

notify pgrst, 'reload schema';
