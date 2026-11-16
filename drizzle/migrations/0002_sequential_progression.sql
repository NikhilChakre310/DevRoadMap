-- Migration 0002: Sequential Month Progression, Topic Assessments & Practical Assignments
create table if not exists public.month_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month_id int not null check (month_id between 1 and 8),
  status text not null default 'Unlocked' check (status in ('Locked', 'Unlocked', 'In Progress', 'Completed')),
  confirmed_complete boolean not null default false,
  completed_at timestamptz,
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month_id)
);

create table if not exists public.topic_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  topic_id text not null,
  score int not null default 0,
  passed boolean not null default false,
  answers jsonb,
  attempt_number int not null default 1,
  feedback text,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id)
);

create table if not exists public.topic_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  topic_id text not null,
  submission_type text not null default 'code' check (submission_type in ('code', 'url', 'text')),
  submission_content text not null,
  status text not null default 'Passed' check (status in ('Passed', 'Failed', 'Pending')),
  feedback text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id)
);

alter table public.user_settings
  add column if not exists active_month int not null default 1,
  add column if not exists active_topic_id text;

do $$ declare t text; begin
foreach t in array array['month_completions', 'topic_assessments', 'topic_assignments'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('drop policy if exists "own rows" on public.%I', t);
  execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id)', t);
end loop; end $$;
