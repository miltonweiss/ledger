alter table public.tasks
  add column if not exists notion_page_id text;

create unique index if not exists tasks_user_notion_page_id_idx
  on public.tasks (user_id, notion_page_id)
  where notion_page_id is not null;
