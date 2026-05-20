-- Pre-auth daily logs are invisible under RLS but still block inserts via the global date unique key.
UPDATE public.daily_logs dl
SET user_id = u.id
FROM (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) u
WHERE dl.user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_logs_date_user_id_key
  ON public.daily_logs (date, user_id);

-- Claim pre-auth rows invisible under RLS but still blocking inserts.
CREATE OR REPLACE FUNCTION public.claim_daily_log(p_date date)
RETURNS SETOF public.daily_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.daily_logs
  SET user_id = auth.uid(), updated_at = now()
  WHERE date = p_date
    AND user_id IS NULL
    AND auth.uid() IS NOT NULL
  RETURNING *;

  RETURN QUERY
  SELECT * FROM public.daily_logs
  WHERE date = p_date AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_log(date) TO authenticated;
