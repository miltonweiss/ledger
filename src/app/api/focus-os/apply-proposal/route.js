import { createClient } from "@supabase/supabase-js";
import { getDefaultDayType, calculateCapacityMode } from "@/lib/focus-os/day.js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY,
);

export async function POST(request) {
  try {
    const { proposal, confirmKill = false } = await request.json();
    if (!proposal) {
      return Response.json({ error: "Missing proposal" }, { status: 400 });
    }

    const dailyLogId = await resolveDailyLogId(proposal);
    if (!dailyLogId) {
      return Response.json({ error: "Could not resolve daily log" }, { status: 400 });
    }

    const logUpdates = {};
    if ("main_block_task_id" in proposal) logUpdates.main_block_task_id = proposal.main_block_task_id;
    if ("side_block_task_id" in proposal) logUpdates.side_block_task_id = proposal.side_block_task_id;
    if (Array.isArray(proposal.cut_task_ids)) logUpdates.cut_task_ids = proposal.cut_task_ids;

    if (Object.keys(logUpdates).length) {
      const { error } = await supabase
        .from("daily_logs")
        .update({ ...logUpdates, updated_at: new Date().toISOString() })
        .eq("id", dailyLogId);
      if (error) throw error;
    }

    if (Array.isArray(proposal.move_tasks)) {
      for (const move of proposal.move_tasks) {
        if (!move?.id) continue;
        const { error } = await supabase.from("tasks").update({ due: move.due || null }).eq("id", move.id);
        if (error) throw error;
      }
    }

    if (confirmKill && Array.isArray(proposal.kill_task_ids) && proposal.kill_task_ids.length) {
      const { error } = await supabase
        .from("tasks")
        .update({ killed_at: new Date().toISOString() })
        .in("id", proposal.kill_task_ids);
      if (error) throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Focus proposal apply failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function resolveDailyLogId(proposal) {
  if (proposal.daily_log_id) return proposal.daily_log_id;
  if (!proposal.date) return null;

  const { data: existing, error: fetchError } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("date", proposal.date)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing?.id) return existing.id;

  const dayType = getDefaultDayType(`${proposal.date}T12:00:00`);
  const capacityMode = calculateCapacityMode({ dayType });
  const { data, error } = await supabase
    .from("daily_logs")
    .insert([{ date: proposal.date, day_type: dayType, capacity_mode: capacityMode, mode: "plan" }])
    .select("id")
    .single();
  if (error) throw error;
  return data?.id || null;
}
