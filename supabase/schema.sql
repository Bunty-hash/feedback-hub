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

-- 6. Panel questions (admin-only accept / decline / reply on Presentation questions) --------
create table if not exists public.panel_questions (
  feedback_id uuid primary key references public.feedback(id) on delete cascade,
  status      text not null default 'accepted' check (status in ('accepted', 'answered', 'declined')),
  reply       text check (reply is null or char_length(reply) <= 4000),
  replied_by  text,
  updated_at  timestamptz not null default now()
);
alter table public.panel_questions enable row level security;
revoke all on public.panel_questions from anon, authenticated;
grant select, insert, update on public.panel_questions to authenticated;
create policy panel_questions_select on public.panel_questions for select to authenticated using (public.is_admin());
create policy panel_questions_insert on public.panel_questions for insert to authenticated with check (public.is_admin());
create policy panel_questions_update on public.panel_questions for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7. Public panel: moderated questions that participants can upvote ------------------------
create table if not exists public.question_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  voter_id    uuid not null,
  created_at  timestamptz not null default now(),
  primary key (feedback_id, voter_id)
);
alter table public.question_votes enable row level security;
revoke all on public.question_votes from anon, authenticated;
grant select on public.question_votes to authenticated;
create policy question_votes_admin_select on public.question_votes for select to authenticated using (public.is_admin());

-- Only questions an admin has accepted or answered are shown. No names are returned.
create or replace function public.panel_public_questions(p_voter uuid default null)
returns table (id uuid, event_name text, event_date date, host_name text, question text, status text, reply text, votes bigint, voted boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.event_name, f.event_date, f.host_name,
         f.comments->>'questions_concerns',
         pq.status,
         case when pq.status = 'answered' then pq.reply end,
         (select count(*) from public.question_votes v where v.feedback_id = f.id),
         coalesce(p_voter is not null and exists (select 1 from public.question_votes v where v.feedback_id = f.id and v.voter_id = p_voter), false),
         f.created_at
  from public.feedback f
  join public.panel_questions pq on pq.feedback_id = f.id
  where f.category = 'presentation' and pq.status in ('accepted', 'answered')
  order by 8 desc, f.created_at desc
$$;

create or replace function public.panel_vote(p_feedback uuid, p_voter uuid, p_on boolean)
returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if p_voter is null then raise exception 'voter required'; end if;
  if not exists (select 1 from public.panel_questions where feedback_id = p_feedback and status in ('accepted', 'answered')) then
    raise exception 'question not open for voting';
  end if;
  if p_on then
    insert into public.question_votes (feedback_id, voter_id) values (p_feedback, p_voter) on conflict do nothing;
  else
    delete from public.question_votes where feedback_id = p_feedback and voter_id = p_voter;
  end if;
  return (select count(*) from public.question_votes where feedback_id = p_feedback);
end $$;

revoke all on function public.panel_public_questions(uuid) from public;
revoke all on function public.panel_vote(uuid, uuid, boolean) from public;
grant execute on function public.panel_public_questions(uuid) to anon, authenticated;
grant execute on function public.panel_vote(uuid, uuid, boolean) to anon, authenticated;
