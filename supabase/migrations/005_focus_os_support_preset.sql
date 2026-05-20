-- Store selected Support Block presets without creating task rows.
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS support_preset_id TEXT;
