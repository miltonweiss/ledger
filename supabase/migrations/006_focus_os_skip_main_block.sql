-- Let a day intentionally run without a Main Block.
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS skip_main_block BOOLEAN DEFAULT false;
