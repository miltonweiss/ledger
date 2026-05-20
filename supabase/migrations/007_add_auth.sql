-- Add user_id column to all tables
alter table public.tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.daily_logs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.chats add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.documents add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.youtube_videos add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.weekly_reviews add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.focus_sessions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.shutdowns add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.document_chunks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.youtube_videos_chunks add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Enable Row Level Security
alter table public.tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.notes enable row level security;
alter table public.chats enable row level security;
alter table public.documents enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.shutdowns enable row level security;
alter table public.document_chunks enable row level security;
alter table public.youtube_videos_chunks enable row level security;

-- Create policies for each table
create policy "users see own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own daily_logs" on public.daily_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own chats" on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own documents" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own youtube_videos" on public.youtube_videos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own weekly_reviews" on public.weekly_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own focus_sessions" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own shutdowns" on public.shutdowns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own document_chunks" on public.document_chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own youtube_videos_chunks" on public.youtube_videos_chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
