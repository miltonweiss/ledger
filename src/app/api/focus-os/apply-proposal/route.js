import { createSupabaseServer } from "@/lib/supabase/server";
import { getDefaultDayType, calculateCapacityMode } from "@/lib/focus-os/day.js";
import { recoverDailyLogAfterConflict } from "@/lib/supabase/daily-log-recovery";
import { archiveNotionTask, updateNotionTask } from "@/lib/notion/tasks";
import { isExternalTaskId, splitTaskIdsByStorage, taskSelectionUpdates } from "@/lib/focus-os/task-refs.js";

export const dynamic = "force-dynamic";


export async function POST(request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposal, confirmKill = false } = await request.json();
    if (!proposal) {
      return Response.json({ error: "Missing proposal" }, { status: 400 });
    }

    const dailyLogId = await resolveDailyLogId(proposal, supabase);
    if (!dailyLogId) {
      return Response.json({ error: "Could not resolve daily log" }, { status: 400 });
    }

    const logUpdates = {};
    if ("main_block_task_id" in proposal) Object.assign(logUpdates, taskSelectionUpdates("main", proposal.main_block_task_id));
    if ("side_block_task_id" in proposal) Object.assign(logUpdates, taskSelectionUpdates("side", proposal.side_block_task_id));
    if (Array.isArray(proposal.cut_task_ids)) {
      const { supabaseIds, externalIds } = splitTaskIdsByStorage(proposal.cut_task_ids);
      logUpdates.cut_task_ids = supabaseIds;
      logUpdates.cut_task_external_ids = externalIds;
    }

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
        if (isExternalTaskId(move.id)) {
          await updateNotionTask(move.id, { due: move.due || null });
          continue;
        }

        const { error } = await supabase.from("tasks").update({ due: move.due || null }).eq("id", move.id);
        if (error) throw error;
      }
    }

    if (confirmKill && Array.isArray(proposal.kill_task_ids) && proposal.kill_task_ids.length) {
      const { supabaseIds, externalIds } = splitTaskIdsByStorage(proposal.kill_task_ids);
      if (supabaseIds.length) {
        const { error } = await supabase
          .from("tasks")
          .update({ killed_at: new Date().toISOString() })
          .in("id", supabaseIds);
        if (error) throw error;
      }

      await Promise.all(externalIds.map((id) => archiveNotionTask(id)));
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Focus proposal apply failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function resolveDailyLogId(proposal, supabase) {
  if (proposal.daily_log_id) return proposal.daily_log_id;
  if (!proposal.date) return null;

  const { data: { user } } = await supabase.auth.getUser();

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
    .insert([{
      date: proposal.date,
      day_type: dayType,
      capacity_mode: capacityMode,
      mode: "plan",
      user_id: user?.id,
    }])
    .select("id")
    .single();

  if (error?.code === "23505") {
    const recovered = await recoverDailyLogAfterConflict(proposal.date, supabase);
    return recovered?.id || null;
  }

  if (error) throw error;
  return data?.id || null;
}
