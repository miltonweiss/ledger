import { supabase } from "./client";
import { recoverDailyLogAfterConflict } from "./daily-log-recovery";
import { calculateCapacityMode, canStopToday, getDefaultDayType, getWeekdayName, toLocalDateString } from "@/lib/focus-os/day.js";
import { buildTodayRecommendation } from "@/lib/focus-os/recommendation.js";
import { calculateWeeklyScore, getWeekRange } from "@/lib/focus-os/score.js";
import { buildSupportPresetTask, getSupportPresetById } from "@/lib/focus-os/support-block-presets.js";
import { getCutTaskIds, getMainBlockTaskId, getSideBlockTaskId, splitTaskIdsByStorage, taskSelectionUpdates } from "@/lib/focus-os/task-refs.js";
import { createTodo, getTodo, updateTodo } from "./todo";

const pendingDailyLogs = new Map();

export async function getOrCreateDailyLog(date = toLocalDateString()) {
  if (pendingDailyLogs.has(date)) {
    return pendingDailyLogs.get(date);
  }

  const promise = getOrCreateDailyLogInner(date);
  pendingDailyLogs.set(date, promise);

  try {
    return await promise;
  } finally {
    pendingDailyLogs.delete(date);
  }
}

async function fetchDailyLogByDate(date, client = supabase) {
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

async function syncDailyLogDayType(existing, date) {
  const dayType = getDefaultDayType(`${date}T12:00:00`);
  if (existing.day_type === dayType) {
    return existing;
  }

  const capacityMode = calculateCapacityMode({
    dayType,
    energy: existing.energy_am,
    guilt: existing.guilt_am,
    mood: existing.mood_am,
    stress: existing.stress_am,
    sleep: existing.sleep_quality,
    recovery: existing.recovery_level,
    mainBlockDone: existing.main_block_done,
    shutdownDone: existing.shutdown_done,
    override: existing.status_override,
  });

  const { data: updated, error: updateError } = await withTimeout(
    supabase
      .from("daily_logs")
      .update({ day_type: dayType, capacity_mode: capacityMode, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single(),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (updateError) {
    console.error("[Focus OS] Error syncing daily log day type:", updateError.code, updateError.message, updateError.details || "");
    return existing;
  }

  return updated;
}

async function getOrCreateDailyLogInner(date) {
  const { data: existing, error: fetchError } = await fetchDailyLogByDate(date);
  if (fetchError) return null;
  if (existing) return syncDailyLogDayType(existing, date);

  const dayType = getDefaultDayType(`${date}T12:00:00`);
  const capacityMode = calculateCapacityMode({ dayType });
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await withTimeout(
    supabase
      .from("daily_logs")
      .insert([{ date, day_type: dayType, capacity_mode: capacityMode, mode: "plan", user_id: user?.id }])
      .select()
      .single(),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (error) {
    if (error.code === "23505") {
      const recovered = await recoverDailyLogAfterConflict(date);
      if (recovered) return syncDailyLogDayType(recovered, date);
    }

    console.error("[Focus OS] Error creating daily log:", error.code, error.message, error.details || "");
    return null;
  }

  return data;
}

export async function createSupportBlockTaskFromPreset(preset, { date }) {
  const taskData = {
    name: preset.title,
    due: date,
    priority: "Average",
    area: preset.area,
    work_type: preset.workType,
    energy_required: preset.energy,
    estimated_minutes: preset.defaultDurationMinutes,
    block_type: "Side Block",
    definition_of_done: preset.defaultDoD,
  };

  return await createTodo(taskData);
}

export async function updateDailyLog(id, updates) {
  const { data, error } = await supabase
    .from("daily_logs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating daily log:", error);
    return null;
  }

  return data;
}

export async function getLatestShutdown(dailyLogId) {
  if (!dailyLogId) return null;
  const { data, error } = await supabase
    .from("shutdowns")
    .select("*")
    .eq("daily_log_id", dailyLogId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching shutdown:", error);
    return null;
  }

  return data;
}

export async function getFocusSessionsForLog(dailyLogId) {
  if (!dailyLogId) return [];
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("*, tasks(*)")
    .eq("daily_log_id", dailyLogId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Error fetching focus sessions:", error);
    return [];
  }

  return normalizeJoinedSessions(data || []);
}

export async function getWeekFocusData(date = new Date()) {
  const { start, end } = getWeekRange(date);
  const startDate = toLocalDateString(start);
  const endDate = toLocalDateString(end);

  const [sessionsResult, logsResult] = await Promise.all([
    supabase
      .from("focus_sessions")
      .select("*, tasks(*)")
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString()),
    supabase
      .from("daily_logs")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  if (sessionsResult.error) console.error("Error fetching weekly sessions:", sessionsResult.error);
  if (logsResult.error) console.error("Error fetching weekly logs:", logsResult.error);

  return {
    sessions: normalizeJoinedSessions(sessionsResult.data || []),
    dailyLogs: logsResult.data || [],
  };
}

export async function getRecentDailyLogs(limit = 21) {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent daily logs:", error);
    return [];
  }

  return data || [];
}

export async function getTodayFocusState({ date = toLocalDateString(), tasks = null } = {}) {
  const dailyLog = await getOrCreateDailyLog(date);
  if (!dailyLog) {
    return {
      date,
      weekday: getWeekdayName(`${date}T12:00:00`),
      dailyLog: null,
      tasks: tasks || [],
      recommendation: null,
      weeklyScore: null,
      shutdown: null,
      focusSessions: [],
      stopPermission: null,
    };
  }

  const [tasksResult, focusSessions, shutdown, weekData, recentLogs] = await Promise.all([
    tasks
      ? Promise.resolve({ data: tasks, error: null })
      : getTodo()
          .then((data) => ({ data, error: null }))
          .catch((error) => ({ data: [], error })),
    getFocusSessionsForLog(dailyLog.id),
    getLatestShutdown(dailyLog.id),
    getWeekFocusData(`${date}T12:00:00`),
    getRecentDailyLogs(21),
  ]);

  if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);

  const allTasks = tasksResult.data || [];
  const mainTask = allTasks.find((task) => task.id === getMainBlockTaskId(dailyLog)) || null;
  const selectedSideTask = allTasks.find((task) => task.id === getSideBlockTaskId(dailyLog)) || null;
  const selectedSupportPresetTask = buildSupportPresetTask(getSupportPresetById(dailyLog.support_preset_id));
  const sideTask = selectedSideTask || selectedSupportPresetTask || null;
  const capacityMode = calculateCapacityMode({
    dayType: dailyLog.day_type,
    energy: dailyLog.energy_am,
    guilt: dailyLog.guilt_am,
    mood: dailyLog.mood_am,
    stress: dailyLog.stress_am,
    sleep: dailyLog.sleep_quality,
    recovery: dailyLog.recovery_level,
    mainBlockDone: dailyLog.main_block_done || mainTask?.done,
    shutdownDone: dailyLog.shutdown_done,
    override: dailyLog.status_override,
  });

  const recommendation = buildTodayRecommendation(allTasks, {
    today: date,
    dayType: dailyLog.day_type,
    capacityMode,
  });

  const weeklyScore = calculateWeeklyScore({
    sessions: weekData.sessions,
    dailyLogs: weekData.dailyLogs,
    today: `${date}T12:00:00`,
  });

  const stopPermission = canStopToday({
    dailyLog: { ...dailyLog, capacity_mode: capacityMode },
    shutdown,
    mainTask,
    dayType: dailyLog.day_type,
    focusSessions,
  });

  return {
    date,
    weekday: getWeekdayName(`${date}T12:00:00`),
    dailyLog: { ...dailyLog, capacity_mode: capacityMode },
    tasks: allTasks,
    mainTask,
    sideTask,
    cutTasks: allTasks.filter((task) => getCutTaskIds(dailyLog).includes(task.id)),
    recommendation,
    weeklyScore,
    shutdown,
    focusSessions,
    recentLogs,
    stopPermission,
  };
}

export async function startFocusSession({ task, dailyLogId, mode, plannedMinutes, goalItems = [] }) {
  const { data: { user } } = await supabase.auth.getUser();
  const hasSupabaseTask = task?.id && !task.isPreset && task.source !== "notion" && !String(task.id).startsWith("notion:");
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert([
      {
        task_id: hasSupabaseTask ? task.id : null,
        daily_log_id: dailyLogId,
        mode,
        planned_minutes: plannedMinutes,
        goal_text: task?.definition_of_done || "",
        goal_items: goalItems,
        started_at: new Date().toISOString(),
        user_id: user?.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error starting focus session:", error);
    return null;
  }

  return data;
}

export async function finishFocusSession({ sessionId, task, dailyLog, actualMinutes, goalItems = [], markDone = false }) {
  const endedAt = new Date().toISOString();
  const { data: session, error } = await supabase
    .from("focus_sessions")
    .update({
      actual_minutes: actualMinutes,
      goal_items: goalItems,
      ended_at: endedAt,
      completed: true,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error finishing focus session:", error);
    return null;
  }

  if (task?.id && !task.isPreset) {
    const nextActual = Number(task.actual_minutes || 0) + Number(actualMinutes || 0);
    const taskUpdates = { actual_minutes: nextActual };
    if (markDone) {
      taskUpdates.done = true;
      taskUpdates.completed_at = endedAt;
    }

    await updateTodo(task.id, taskUpdates);

    if (task.source !== "notion" && dailyLog?.main_block_task_id === task.id) {
      await updateDailyLog(dailyLog.id, { main_block_done: true });
    }

    if (task.source !== "notion" && dailyLog?.side_block_task_id === task.id) {
      await updateDailyLog(dailyLog.id, { side_block_done: true });
    }
  }

  if (task?.isPreset && dailyLog?.support_preset_id === task.preset_id) {
    await updateDailyLog(dailyLog.id, { side_block_done: true });
  }

  return session;
}

export async function saveShutdown({ dailyLog, produced, nextStep, nextStepDate, stopPermissionGranted }) {
  if (!dailyLog?.id) return null;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: shutdown, error } = await supabase
    .from("shutdowns")
    .insert([
      {
        daily_log_id: dailyLog.id,
        produced,
        next_step: nextStep,
        next_step_date: nextStepDate,
        stop_permission_granted: stopPermissionGranted,
        user_id: user?.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error saving shutdown:", error);
    return null;
  }

  await updateDailyLog(dailyLog.id, {
    shutdown_done: true,
    energy_pm: dailyLog.energy_pm,
    guilt_pm: dailyLog.guilt_pm,
  });

  if (nextStep) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("tasks").insert([
      {
        name: nextStep,
        done: false,
        due: nextStepDate,
        priority: "Average",
        area: "WSO",
        work_type: "Cash",
        block_type: "Green Work",
        energy_required: "Medium",
        definition_of_done: nextStep,
        estimated_minutes: 45,
        user_id: user?.id,
      },
    ]);
  }

  return shutdown;
}

export async function saveWeeklyReview(review) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .insert([{ ...review, user_id: user?.id }])
    .select()
    .single();

  if (error) {
    console.error("Error saving weekly review:", error);
    return null;
  }
  return data;
}

export async function applyFocusProposal(proposal, { confirmKill = false } = {}) {
  if (!proposal?.daily_log_id && !proposal?.date) {
    return { ok: false, error: "Proposal is missing a daily log." };
  }

  const dailyLog = proposal.daily_log_id
    ? { id: proposal.daily_log_id }
    : await getOrCreateDailyLog(proposal.date);

  const logUpdates = {};
  if ("main_block_task_id" in proposal) Object.assign(logUpdates, taskSelectionUpdates("main", proposal.main_block_task_id));
  if ("side_block_task_id" in proposal) Object.assign(logUpdates, taskSelectionUpdates("side", proposal.side_block_task_id));
  if (Array.isArray(proposal.cut_task_ids)) {
    const { supabaseIds, externalIds } = splitTaskIdsByStorage(proposal.cut_task_ids);
    logUpdates.cut_task_ids = supabaseIds;
    logUpdates.cut_task_external_ids = externalIds;
  }

  if (Object.keys(logUpdates).length) {
    await updateDailyLog(dailyLog.id, logUpdates);
  }

  if (Array.isArray(proposal.move_tasks)) {
    await Promise.all(
      proposal.move_tasks
        .filter((move) => move?.id)
        .map((move) => updateTodo(move.id, { due: move.due || null })),
    );
  }

  if (confirmKill && Array.isArray(proposal.kill_task_ids) && proposal.kill_task_ids.length) {
    await Promise.all(
      proposal.kill_task_ids
        .filter(Boolean)
        .map((id) => updateTodo(id, { killed_at: new Date().toISOString() })),
    );
  }

  return { ok: true };
}

function normalizeJoinedSessions(sessions) {
  return sessions.map((session) => ({
    ...session,
    task: session.task || session.tasks || null,
  }));
}

function isMissingFocusSchema(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("daily_logs") ||
    message.includes("focus_sessions") ||
    message.includes("shutdowns")
  );
}

function withTimeout(promise, fallback, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}
