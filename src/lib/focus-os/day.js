import {
  BLOCKED_SUNDAY_AREAS,
  BLOCKED_SUNDAY_WORK_TYPES,
  CAPACITY_MODE,
  DAY_TYPES,
  TIMER_DEFAULTS,
  WEEKDAY_DAY_TYPES,
  FOCUS_MODES,
} from "./constants.js";

export function toLocalDateString(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekdayName(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    date instanceof Date ? date : new Date(date),
  );
}

export function getDefaultDayType(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return WEEKDAY_DAY_TYPES[value.getDay()] || DAY_TYPES.SHORT;
}

export function getNextMonday(date = new Date()) {
  const value = date instanceof Date ? new Date(date) : new Date(date);
  const day = value.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  value.setDate(value.getDate() + daysUntilMonday);
  return toLocalDateString(value);
}

export function calculateCapacityMode({
  dayType,
  energy = null,
  guilt = null,
  mainBlockDone = false,
  shutdownDone = false,
  override = null,
} = {}) {
  if (override) return override;
  if (dayType === DAY_TYPES.SUNDAY) return CAPACITY_MODE.PROTECTED;
  if (Number(energy) <= 3 || Number(guilt) >= 8) return CAPACITY_MODE.PROTECTED;
  if (dayType === DAY_TYPES.FREE) return CAPACITY_MODE.LIMITED;
  if (mainBlockDone && shutdownDone) return CAPACITY_MODE.LIMITED;
  if (dayType === DAY_TYPES.LONG && Number(energy) >= 7) return CAPACITY_MODE.FULL;
  return CAPACITY_MODE.LIMITED;
}

export function getTimerDefault(mode, dayType) {
  const contextual = TIMER_DEFAULTS[`${mode}:${dayType}`];
  if (typeof contextual === "number") return contextual;
  return TIMER_DEFAULTS[mode] ?? TIMER_DEFAULTS[FOCUS_MODES.GREEN];
}

export function isSundayBlockedTask(task = {}) {
  return (
    BLOCKED_SUNDAY_AREAS.has(task.area) ||
    BLOCKED_SUNDAY_WORK_TYPES.has(task.work_type)
  );
}

export function canStopToday({ dailyLog, shutdown, mainTask, dayType, focusSessions = [] }) {
  const effectiveDayType = dayType || dailyLog?.day_type;
  if (effectiveDayType === DAY_TYPES.SUNDAY) {
    const blockedWorkDone = focusSessions.some((session) => {
      const task = session.task || session.tasks || {};
      return session.completed && isSundayBlockedTask(task);
    });

    if (blockedWorkDone) {
      return {
        allowed: false,
        title: "Sunday protection was broken.",
        message: "Do the shutdown, move the work residue to Monday, then stop.",
        checks: [
          { label: "No protected work completed", done: false },
          { label: "Shutdown done", done: Boolean(dailyLog?.shutdown_done) },
        ],
      };
    }

    return {
      allowed: true,
      title: "Yes. Sunday is protected.",
      message: "Today counts as won because you are not turning rest into work.",
      checks: [
        { label: "Protected work avoided", done: true },
        { label: "Recovery day respected", done: true },
      ],
    };
  }

  const mainDone = Boolean(dailyLog?.main_block_done || mainTask?.done);
  const shutdownDone = Boolean(dailyLog?.shutdown_done);
  const nextStepSaved = Boolean(shutdown?.next_step && shutdown?.next_step_date);
  const allowed = mainDone && shutdownDone && nextStepSaved;

  if (allowed) {
    return {
      allowed: true,
      title: "Yes. You have done enough.",
      message: "Stop now. The next step is saved.",
      checks: [
        { label: "Main block done", done: true },
        { label: "Next step saved", done: true },
        { label: "Shutdown done", done: true },
      ],
    };
  }

  if (mainDone && !shutdownDone) {
    return {
      allowed: false,
      title: "Almost. No more work is required.",
      message: "You do not need to keep working. You only need the shutdown.",
      checks: [
        { label: "Main block done", done: true },
        { label: "Shutdown done", done: false },
        { label: "Next step saved", done: nextStepSaved },
      ],
    };
  }

  return {
    allowed: false,
    title: "Not yet.",
    message: "Finish the main block or consciously choose a smaller one, then do shutdown.",
    checks: [
      { label: "Main block done", done: mainDone },
      { label: "Shutdown done", done: shutdownDone },
      { label: "Next step saved", done: nextStepSaved },
    ],
  };
}
