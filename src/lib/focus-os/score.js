import { WEEKLY_DEFAULTS } from "./constants.js";

function sessionTask(session) {
  return session.task || session.tasks || {};
}

function completedMinutes(session) {
  if (!session.completed) return 0;
  return Number(session.actual_minutes || session.planned_minutes || 0);
}

export function getWeekRange(date = new Date()) {
  const value = date instanceof Date ? new Date(date) : new Date(date);
  const day = value.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(value);
  start.setDate(value.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function calculateWeeklyScore({ sessions = [], dailyLogs = [], today = new Date() } = {}) {
  const wsoMinutes = sessions.reduce((total, session) => {
    const task = sessionTask(session);
    if (task.area === "WSO") return total + completedMinutes(session);
    return total;
  }, 0);

  const schoolMinutes = sessions.reduce((total, session) => {
    const task = sessionTask(session);
    if (task.area === "School") return total + completedMinutes(session);
    return total;
  }, 0);

  const cashSessions = sessions.filter((session) => {
    const task = sessionTask(session);
    return session.completed && task.work_type === "Cash";
  }).length;

  const freelanceMinutes = sessions.reduce((total, session) => {
    const task = sessionTask(session);
    if (task.area === "Freelance") return total + completedMinutes(session);
    return total;
  }, 0);

  const gymSessions = sessions.filter((session) => {
    const task = sessionTask(session);
    return session.completed && task.area === "Body";
  }).length;

  const sundayLog = dailyLogs.find((log) => log.day_type === "Protected Sunday");
  const sundayProtected = sundayLog ? !sundayLog.main_block_done : null;

  const wsoHours = roundOne(wsoMinutes / 60);
  const schoolHours = roundOne(schoolMinutes / 60);
  const freelanceHours = roundOne(freelanceMinutes / 60);

  const status = "In Progress"; // No overall status score needed

  return {
    wsoHours,
    wsoTarget: WEEKLY_DEFAULTS.WSO_DEEP_WORK_HOURS,
    cashSessions,
    cashTarget: WEEKLY_DEFAULTS.CASH_SESSIONS,
    schoolHours,
    schoolTarget: 2, // arbitrary minimum
    freelanceHours,
    freelanceMax: WEEKLY_DEFAULTS.FREELANCE_MAX_HOURS,
    gymSessions,
    gymTarget: WEEKLY_DEFAULTS.GYM_SESSIONS,
    sundayProtected,
    status,
    fakeWork: detectFakeWork(sessions),
  };
}

export function detectFakeWork(sessions = []) {
  const completed = sessions.filter((session) => session.completed);
  const cash = completed.filter((session) => sessionTask(session).work_type === "Cash").length;
  const assetAdmin = completed.filter((session) => {
    const task = sessionTask(session);
    return task.work_type === "Asset" || task.work_type === "Maintenance" || task.area === "Admin";
  }).length;

  if (cash === 0 && assetAdmin >= 3) {
    return {
      active: true,
      title: "Fake productivity possible.",
      message: "Asset/Admin work is moving, but Cash work has not happened this week. Put 45 minutes into outreach or follow-ups.",
    };
  }

  if (assetAdmin >= cash * 3 && assetAdmin >= 4) {
    return {
      active: true,
      title: "Builder bias detected.",
      message: "You are building more than you are getting market feedback. Add one Cash session today.",
    };
  }

  return {
    active: false,
    title: "Cash signal is okay.",
    message: "No fake-work warning right now.",
  };
}

export function buildGuiltInsight(dailyLogs = []) {
  const logs = dailyLogs.filter((log) => log.guilt_am != null || log.guilt_pm != null);
  if (logs.length < 14) {
    return {
      ready: false,
      message: `${Math.max(0, 14 - logs.length)} more logged days until guilt insights unlock.`,
    };
  }

  const sunday = average(logs.filter((log) => log.day_type === "Protected Sunday").map((log) => log.guilt_pm ?? log.guilt_am));
  const noCash = average(logs.filter((log) => !log.main_block_done).map((log) => log.guilt_pm ?? log.guilt_am));
  const guiltDrop = average(logs.map((log) => (log.guilt_am ?? 0) - (log.guilt_pm ?? log.guilt_am ?? 0)));

  const notes = [];
  if (sunday >= 7) notes.push("Sundays carry high guilt.");
  if (noCash >= 7) notes.push("Guilt rises on days without a completed main block.");
  if (guiltDrop >= 2) notes.push("Shutdown and visible output reduce guilt after work.");

  return {
    ready: true,
    message: notes.length ? notes.join(" ") : "No strong guilt pattern yet. Keep logging.",
  };
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}
