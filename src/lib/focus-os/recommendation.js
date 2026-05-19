import { DAY_TYPES } from "./constants.js";
import { validateDefinitionOfDone, isTaskPlannable } from "./validation.js";

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function priorityScore(priority) {
  if (priority === "Important") return 30;
  if (priority === "Average") return 12;
  return 4;
}

function energyScore(task, status) {
  const energy = task.energy_required || "Medium";
  if (status === "Recovery / Stop Day") return energy === "Low" ? 16 : energy === "Medium" ? 4 : -18;
  if (energy === "High") return 8;
  if (energy === "Medium") return 10;
  return 6;
}

function scoreTask(task, { today, status, dayType } = {}) {
  if (!task || task.done || task.killed_at) return -999;

  let score = 0;
  const due = normalizeDate(task.due);
  if (due && due < today) score += 35;
  if (due === today) score += 28;
  if (!due) score += 8;

  score += priorityScore(task.priority);
  score += energyScore(task, status);

  if (task.area === "WSO") score += 18;
  if (task.work_type === "Cash") score += 24;
  if (task.work_type === "Asset") score += 7;
  if (task.block_type === "Main Block") score += 28;
  if (task.block_type === "Side Block") score += 9;
  if (validateDefinitionOfDone(task.definition_of_done).valid) score += 10;
  if (task.estimated_minutes) score += Math.max(0, 12 - Math.floor(task.estimated_minutes / 30));

  if (dayType === DAY_TYPES.SUNDAY && (task.area === "WSO" || task.area === "Freelance" || task.work_type === "Cash")) {
    score -= 200;
  }

  return score;
}

export function buildTodayRecommendation(tasks = [], { today, dayType, capacityMode } = {}) {
  const plannableCandidates = tasks
    .filter((task) => task && !task.done && !task.killed_at && isTaskPlannable(task))
    .map((task) => ({ task, score: scoreTask(task, { today, dayType, status: capacityMode }) }))
    .sort((a, b) => b.score - a.score);

  const needsClarification = tasks.filter((task) => task && !task.done && !task.killed_at && !isTaskPlannable(task));

  if (dayType === DAY_TYPES.SUNDAY) {
    const allowed = plannableCandidates.filter(({ task }) => {
      return task.area === "Body" || task.area === "Relationship" || task.work_type === "Recovery";
    });

    return {
      mainBlock: null,
      sideBlock: allowed[0]?.task || null,
      cut: tasks.filter((task) => task.area === "WSO" || task.area === "Freelance" || task.work_type === "Cash"),
      needsClarification,
      reason: "Protected Sunday: work is intentionally blocked.",
    };
  }

  const mainBlock = plannableCandidates[0]?.task || null;
  const sideBlock = plannableCandidates.find(({ task }) => task.id !== mainBlock?.id && task.energy_required !== "High")?.task || null;
  const cut = plannableCandidates
    .filter(({ task }) => task.id !== mainBlock?.id && task.id !== sideBlock?.id)
    .slice(0, 5)
    .map(({ task }) => task);

  return {
    mainBlock,
    sideBlock,
    cut,
    needsClarification,
    reason: mainBlock
      ? "Picked from priority, cash value, due date, energy fit, and clear finish line."
      : "No unfinished task is ready. Create one small concrete task.",
  };
}

export function buildTaskCleanerProposal(tasks = [], { today, dayType, capacityMode } = {}) {
  const recommendation = buildTodayRecommendation(tasks, { today, dayType, capacityMode });
  const keepIds = [recommendation.mainBlock?.id, recommendation.sideBlock?.id].filter(Boolean);
  const active = tasks.filter((task) => !task.done && !task.killed_at);
  const cutIds = recommendation.cut.map((task) => task.id).filter(Boolean);
  const killIds = active
    .filter((task) => {
      const name = String(task.name || "").toLowerCase();
      return name.includes("notion") || name.includes("new tool") || name.includes("rebuild everything");
    })
    .map((task) => task.id);

  return {
    kind: "clean_day",
    title: "Clean my day",
    summary: "Keep one main block, one small side block, and cut the rest from today.",
    main_block_task_id: recommendation.mainBlock?.id || null,
    side_block_task_id: recommendation.sideBlock?.id || null,
    cut_task_ids: cutIds,
    keep_task_ids: keepIds,
    move_tasks: active
      .filter((task) => !keepIds.includes(task.id) && !cutIds.includes(task.id))
      .slice(0, 4)
      .map((task) => ({ id: task.id, due: null })),
    kill_task_ids: killIds,
  };
}
