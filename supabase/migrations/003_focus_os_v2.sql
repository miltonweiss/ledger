-- daily_logs erweitern
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'plan' CHECK (mode IN ('plan','execute','shutdown','closed')),
  ADD COLUMN IF NOT EXISTS capacity_mode TEXT,        -- Full/Limited/Protected
  ADD COLUMN IF NOT EXISTS capacity_minutes INT,      -- computed budget
  ADD COLUMN IF NOT EXISTS reopen_reason TEXT;        -- Stop Lock Override

-- Drop old constraints and columns if needed (optional but good for clean schema)
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_status_check;
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_status_override_check;
ALTER TABLE public.daily_logs ALTER COLUMN status DROP NOT NULL;

-- weekly_reviews (neu)
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  overrun_days TEXT[],
  deferred_tasks TEXT[],
  fake_productivity_notes TEXT,
  best_output TEXT,
  one_process_fix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security (RLS) to allow the app to read/write without authentication
ALTER TABLE public.weekly_reviews DISABLE ROW LEVEL SECURITY;
