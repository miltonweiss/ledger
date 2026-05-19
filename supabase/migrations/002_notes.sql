create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  content jsonb default '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Disable Row Level Security (RLS) to allow the app to read/write without authentication
alter table public.notes disable row level security;
