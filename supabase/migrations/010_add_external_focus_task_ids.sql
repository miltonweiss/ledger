alter table public.daily_logs
  add column if not exists main_block_external_id text,
  add column if not exists side_block_external_id text,
  add column if not exists cut_task_external_ids text[] default '{}';
