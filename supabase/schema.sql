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

-- 6. Panel channels (Kahoot-style): admins create a channel with a 6-digit PIN; participants join, ask, upvote, reply --
create table if not exists public.channels (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[0-9]{6}$'),
  title      text not null check (char_length(title) between 1 and 120),
  kind       text not null default 'Presentation' check (char_length(kind) <= 60),
  speaker    text check (speaker is null or char_length(speaker) <= 100),
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.channel_questions (
  accepted boolean not null default false,
  accepted_at timestamptz,
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.channels(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  author_name text check (author_name is null or char_length(author_name) <= 40),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists public.channel_replies (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.channel_questions(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  author_name text check (author_name is null or char_length(author_name) <= 40),
  is_host     boolean not null default false,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists public.channel_votes (
  question_id uuid not null references public.channel_questions(id) on delete cascade,
  voter_id    uuid not null,
  created_at  timestamptz not null default now(),
  primary key (question_id, voter_id)
);
create index if not exists channel_questions_channel_idx on public.channel_questions (channel_id);
create index if not exists channel_replies_question_idx on public.channel_replies (question_id);

alter table public.channels enable row level security;
alter table public.channel_questions enable row level security;
alter table public.channel_replies enable row level security;
alter table public.channel_votes enable row level security;
revoke all on public.channels, public.channel_questions, public.channel_replies, public.channel_votes from anon, authenticated;
grant select, insert, update, delete on public.channels, public.channel_questions, public.channel_replies to authenticated;
grant select on public.channel_votes to authenticated;
create policy channels_admin on public.channels for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy channel_questions_admin on public.channel_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy channel_replies_admin on public.channel_replies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy channel_votes_admin on public.channel_votes for select to authenticated using (public.is_admin());

-- Participants never touch the tables directly; they call these functions with the channel PIN.
create or replace function public.channel_join(p_code text)
returns table (id uuid, code text, title text, kind text, speaker text, status text)
language sql stable security definer set search_path = public as $$
  select c.id, c.code, c.title, c.kind, c.speaker, c.status from public.channels c where c.code = p_code
$$;

create or replace function public.channel_questions_list(p_code text, p_voter uuid default null)
returns table (id uuid, body text, author_name text, votes bigint, voted boolean, created_at timestamptz, replies jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.body, q.author_name,
         (select count(*) from public.channel_votes v where v.question_id = q.id),
         coalesce(p_voter is not null and exists (select 1 from public.channel_votes v where v.question_id = q.id and v.voter_id = p_voter), false),
         q.created_at,
         coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'author_name', r.author_name, 'is_host', r.is_host, 'created_at', r.created_at) order by r.created_at)
                   from public.channel_replies r where r.question_id = q.id and not r.hidden), '[]'::jsonb)
  from public.channel_questions q
  join public.channels c on c.id = q.channel_id
  where c.code = p_code and not q.hidden
  order by 4 desc, q.created_at desc
$$;

create or replace function public.channel_ask(p_code text, p_body text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; qid uuid;
begin
  select id into cid from public.channels where code = p_code and status = 'open';
  if cid is null then raise exception 'channel not open'; end if;
  insert into public.channel_questions (channel_id, body, author_name)
  values (cid, btrim(p_body), nullif(btrim(coalesce(p_name, '')), '')) returning id into qid;
  return qid;
end $$;

create or replace function public.channel_reply(p_code text, p_question uuid, p_body text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not exists (select 1 from public.channel_questions q join public.channels c on c.id = q.channel_id
                 where q.id = p_question and c.code = p_code and c.status = 'open' and not q.hidden) then
    raise exception 'question not open';
  end if;
  insert into public.channel_replies (question_id, body, author_name)
  values (p_question, btrim(p_body), nullif(btrim(coalesce(p_name, '')), '')) returning id into rid;
  return rid;
end $$;

create or replace function public.channel_vote(p_code text, p_question uuid, p_voter uuid, p_on boolean)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if p_voter is null then raise exception 'voter required'; end if;
  if not exists (select 1 from public.channel_questions q join public.channels c on c.id = q.channel_id
                 where q.id = p_question and c.code = p_code and c.status = 'open' and not q.hidden) then
    raise exception 'question not open';
  end if;
  if p_on then
    insert into public.channel_votes (question_id, voter_id) values (p_question, p_voter) on conflict do nothing;
  else
    delete from public.channel_votes where question_id = p_question and voter_id = p_voter;
  end if;
  return (select count(*) from public.channel_votes where question_id = p_question);
end $$;

revoke all on function public.channel_join(text), public.channel_questions_list(text, uuid), public.channel_ask(text, text, text),
  public.channel_reply(text, uuid, text, text), public.channel_vote(text, uuid, uuid, boolean) from public;
grant execute on function public.channel_join(text), public.channel_questions_list(text, uuid), public.channel_ask(text, text, text),
  public.channel_reply(text, uuid, text, text), public.channel_vote(text, uuid, uuid, boolean) to anon, authenticated;
