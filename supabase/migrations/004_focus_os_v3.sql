-- Add expanded daily level fields for Guided Today Setup
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS mood_am INT CHECK (mood_am IS NULL OR mood_am BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS stress_am INT CHECK (stress_am IS NULL OR stress_am BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS sleep_quality INT CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS recovery_level INT CHECK (recovery_level IS NULL OR recovery_level BETWEEN 0 AND 10);
