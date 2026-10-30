-- =====================================================================
-- Feedback Hub: Supabase schema with Row Level Security
-- Run once in Supabase > SQL Editor (or ask Claude to apply it later).
-- =====================================================================

-- 1. Admin allow-list ---------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies on purpose: the table cannot be read or changed through the API.
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Feedback table -----------------------------------------------------
create table if not exists public.feedback (
  id               uuid primary key default gen_random_uuid(),
  category         text not null
                     check (category in ('training', 'exhibition', 'masterclass', 'presentation')),
  participant_name text
                     check (participant_name is null or char_length(participant_name) <= 100),
  event_name       text not null
                     check (char_length(btrim(event_name)) between 1 and 200),
  event_date       date not null,
  host_name        text
                     check (host_name is null or char_length(host_name) <= 100),
  overall_rating   smallint not null
                     check (overall_rating between 1 and 5),
  sentiment        text generated always as (
                     case
                       when overall_rating >= 4 then 'positive'
                       when overall_rating = 3 then 'neutral'
                       else 'negative'
                     end
                   ) stored,
  ratings          jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(ratings) = 'object' and char_length(ratings::text) <= 2000),
  comments         jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(comments) = 'object' and char_length(comments::text) <= 20000),
  created_at       timestamptz not null default now()
);

create index if not exists feedback_category_idx   on public.feedback (category);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

-- 3. Row Level Security -------------------------------------------------
alter table public.feedback enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can read feedback" on public.feedback;
create policy "Admins can read feedback"
  on public.feedback for select
  to authenticated
  using (public.is_admin());

-- No update or delete policies: submissions cannot be edited or removed through the API.

-- 4. Privileges (belt and braces on top of RLS) -------------------------
revoke all on public.feedback from anon, authenticated;
-- Visitors may only set the answer columns (id, sentiment and created_at are server-controlled).
grant insert (category, participant_name, event_name, event_date, host_name,
              overall_rating, ratings, comments)
  on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;

-- 5. Make yourself an admin --------------------------------------------
-- Step A: Supabase > Authentication > Users > Add user (email + password, tick "Auto confirm").
-- Step B: replace the email below with that user's email, remove the leading "--" and run it.
--
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL'
-- on conflict do nothing;
