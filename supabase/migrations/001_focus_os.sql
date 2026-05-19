alter table if exists public.tasks
  add column if not exists area text,
  add column if not exists work_type text,
  add column if not exists block_type text,
  add column if not exists energy_required text,
  add column if not exists definition_of_done text,
  add column if not exists estimated_minutes integer,
  add column if not exists actual_minutes integer default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists killed_at timestamptz;

alter table if exists public.tasks
  add constraint tasks_area_focus_os_check
    check (area is null or area in ('WSO', 'School', 'Freelance', 'Body', 'Relationship', 'Admin')) not valid,
  add constraint tasks_work_type_focus_os_check
    check (work_type is null or work_type in ('Cash', 'Asset', 'Maintenance', 'Recovery')) not valid,
  add constraint tasks_block_type_focus_os_check
    check (block_type is null or block_type in ('Green Work', 'Main Block', 'Side Block')) not valid,
  add constraint tasks_energy_required_focus_os_check
    check (energy_required is null or energy_required in ('Low', 'Medium', 'High')) not valid;

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  day_type text not null,
  status text not null,
  status_override text,
  energy_am integer,
  guilt_am integer,
  energy_pm integer,
  guilt_pm integer,
  main_block_task_id uuid references public.tasks(id) on delete set null,
  side_block_task_id uuid references public.tasks(id) on delete set null,
  cut_task_ids uuid[] default '{}',
  main_block_done boolean default false,
  side_block_done boolean default false,
  shutdown_done boolean default false,
  score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint daily_logs_day_type_check check (day_type in ('Short Day', 'Long Day', 'Free Day', 'Protected Sunday')),
  constraint daily_logs_status_check check (status in ('Growth Day', 'Stability Day', 'Recovery / Stop Day')),
  constraint daily_logs_status_override_check check (status_override is null or status_override in ('Growth Day', 'Stability Day', 'Recovery / Stop Day')),
  constraint daily_logs_energy_am_check check (energy_am is null or energy_am between 0 and 10),
  constraint daily_logs_guilt_am_check check (guilt_am is null or guilt_am between 0 and 10),
  constraint daily_logs_energy_pm_check check (energy_pm is null or energy_pm between 0 and 10),
  constraint daily_logs_guilt_pm_check check (guilt_pm is null or guilt_pm between 0 and 10)
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  daily_log_id uuid references public.daily_logs(id) on delete cascade,
  mode text not null,
  planned_minutes integer not null,
  actual_minutes integer default 0,
  goal_text text,
  goal_items jsonb default '[]'::jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz,
  completed boolean default false,
  created_at timestamptz default now(),
  constraint focus_sessions_mode_check check (mode in ('Green Work', 'Main Block', 'Side Block', 'Shutdown', 'Open Goal'))
);

create table if not exists public.shutdowns (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid references public.daily_logs(id) on delete cascade,
  produced text not null,
  next_step text not null,
  next_step_date date not null,
  stop_permission_granted boolean default false,
  created_at timestamptz default now()
);

create index if not exists focus_sessions_daily_log_id_idx on public.focus_sessions(daily_log_id);
create index if not exists focus_sessions_task_id_idx on public.focus_sessions(task_id);
create index if not exists shutdowns_daily_log_id_idx on public.shutdowns(daily_log_id);

-- Disable Row Level Security (RLS) to allow the app to read/write without authentication
alter table public.tasks disable row level security;
alter table public.daily_logs disable row level security;
alter table public.focus_sessions disable row level security;
alter table public.shutdowns disable row level security;
