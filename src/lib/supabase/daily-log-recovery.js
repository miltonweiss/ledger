import { supabase } from "./client";

function withTimeout(promise, fallback, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

async function fetchDailyLogByDate(date, client) {
  const { data, error } = await withTimeout(
    client.from("daily_logs").select("*").eq("date", date).maybeSingle(),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (error) {
    console.error("[Focus OS] Error fetching daily log:", error.code, error.message, error.details || "");
    return { data: null, error };
  }

  return { data, error: null };
}

/** Re-fetch or claim a pre-auth daily log after a date unique-key conflict. */
export async function recoverDailyLogAfterConflict(date, client = supabase) {
  const { data: claimed, error: claimError } = await withTimeout(
    client.rpc("claim_daily_log", { p_date: date }),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (!claimError) {
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if (row?.id) return row;
  }

  const { data: retry, error: retryError } = await fetchDailyLogByDate(date, client);
  if (!retryError && retry) return retry;
  return null;
}
