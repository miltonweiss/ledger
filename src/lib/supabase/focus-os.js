import { supabase } from "./client";
import { calculateCapacityMode, canStopToday, getDefaultDayType, getWeekdayName, toLocalDateString } from "@/lib/focus-os/day.js";
import { buildTodayRecommendation } from "@/lib/focus-os/recommendation.js";
import { calculateWeeklyScore, getWeekRange } from "@/lib/focus-os/score.js";

export async function getOrCreateDailyLog(date = toLocalDateString()) {
  const { data: existing, error: fetchError } = await withTimeout(
    supabase
      .from("daily_logs")
      .select("*")
      .eq("date", date)
      .maybeSingle(),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (fetchError) {
    console.error("[Focus OS] Error fetching daily log:", fetchError.code, fetchError.message, fetchError.details || "");
    return null;
  }

  if (existing) return existing;

  const dayType = getDefaultDayType(`${date}T12:00:00`);
  const capacityMode = calculateCapacityMode({ dayType });
  const { data, error } = await withTimeout(
    supabase
      .from("daily_logs")
      .insert([{ date, day_type: dayType, capacity_mode: capacityMode, mode: "plan" }])
      .select()
      .single(),
    { data: null, error: { code: "FOCUS_TIMEOUT", message: "Focus OS request timed out" } },
  );

  if (error) {
    console.error("[Focus OS] Error creating daily log:", error.code, error.message, error.details || "");
    return null;
  }

  return data;
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
      : supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    getFocusSessionsForLog(dailyLog.id),
    getLatestShutdown(dailyLog.id),
    getWeekFocusData(`${date}T12:00:00`),
    getRecentDailyLogs(21),
  ]);

  if (tasksResult.error) console.error("Error fetching tasks:", tasksResult.error);

  const allTasks = tasksResult.data || [];
  const mainTask = allTasks.find((task) => task.id === dailyLog.main_block_task_id) || null;
  const sideTask = allTasks.find((task) => task.id === dailyLog.side_block_task_id) || null;
  const capacityMode = calculateCapacityMode({
    dayType: dailyLog.day_type,
    energy: dailyLog.energy_am,
    guilt: dailyLog.guilt_am,
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
    cutTasks: allTasks.filter((task) => dailyLog.cut_task_ids?.includes(task.id)),
    recommendation,
    weeklyScore,
    shutdown,
    focusSessions,
    recentLogs,
    stopPermission,
  };
}

export async function startFocusSession({ task, dailyLogId, mode, plannedMinutes, goalItems = [] }) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert([
      {
        task_id: task?.id || null,
        daily_log_id: dailyLogId,
        mode,
        planned_minutes: plannedMinutes,
        goal_text: task?.definition_of_done || "",
        goal_items: goalItems,
        started_at: new Date().toISOString(),
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

  if (task?.id) {
    const nextActual = Number(task.actual_minutes || 0) + Number(actualMinutes || 0);
    const taskUpdates = { actual_minutes: nextActual };
    if (markDone) {
      taskUpdates.done = true;
      taskUpdates.completed_at = endedAt;
    }

    await supabase.from("tasks").update(taskUpdates).eq("id", task.id);

    if (dailyLog?.main_block_task_id === task.id) {
      await updateDailyLog(dailyLog.id, { main_block_done: true });
    }

    if (dailyLog?.side_block_task_id === task.id) {
      await updateDailyLog(dailyLog.id, { side_block_done: true });
    }
  }

  return session;
}

export async function saveShutdown({ dailyLog, produced, nextStep, nextStepDate, stopPermissionGranted }) {
  if (!dailyLog?.id) return null;

  const { data: shutdown, error } = await supabase
    .from("shutdowns")
    .insert([
      {
        daily_log_id: dailyLog.id,
        produced,
        next_step: nextStep,
        next_step_date: nextStepDate,
        stop_permission_granted: stopPermissionGranted,
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
      },
    ]);
  }

  return shutdown;
}

export async function saveWeeklyReview(review) {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .insert([review])
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
  if ("main_block_task_id" in proposal) logUpdates.main_block_task_id = proposal.main_block_task_id;
  if ("side_block_task_id" in proposal) logUpdates.side_block_task_id = proposal.side_block_task_id;
  if (Array.isArray(proposal.cut_task_ids)) logUpdates.cut_task_ids = proposal.cut_task_ids;

  if (Object.keys(logUpdates).length) {
    await updateDailyLog(dailyLog.id, logUpdates);
  }

  if (Array.isArray(proposal.move_tasks)) {
    await Promise.all(
      proposal.move_tasks
        .filter((move) => move?.id)
        .map((move) => supabase.from("tasks").update({ due: move.due || null }).eq("id", move.id)),
    );
  }

  if (confirmKill && Array.isArray(proposal.kill_task_ids) && proposal.kill_task_ids.length) {
    await supabase
      .from("tasks")
      .update({ killed_at: new Date().toISOString() })
      .in("id", proposal.kill_task_ids);
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
