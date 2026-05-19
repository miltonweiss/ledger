export const AREAS = ["WSO", "School", "Freelance", "Body", "Relationship", "Admin"];

export const WORK_TYPES = ["Cash", "Asset", "Maintenance", "Recovery"];

export const BLOCK_TYPES = ["Green Work", "Main Block", "Side Block"];

export const ENERGY_LEVELS = ["Low", "Medium", "High"];

export const DAY_TYPES = {
  SHORT: "Short Day",
  LONG: "Long Day",
  FREE: "Free Day",
  SUNDAY: "Protected Sunday",
};

export const CAPACITY_MODE = {
  FULL: "Full Capacity",
  LIMITED: "Limited Capacity",
  PROTECTED: "Protected Capacity",
};

export const CAPACITY_BUDGET = {
  "Long Day":         { main: 90,  side: 40, total: 180 },
  "Short Day":        { main: 75,  side: 20, total: 120 },
  "Free Day":         { main: 120, side: 0,  total: 180 },
  "Protected Sunday": { main: 0,   side: 0,  total: 0   },
};

export const FOCUS_MODES = {
  GREEN: "Green Work",
  MAIN: "Main Block",
  SIDE: "Side Block",
  SHUTDOWN: "Shutdown",
  OPEN_GOAL: "Open Goal",
};

export const TIMER_DEFAULTS = {
  [FOCUS_MODES.GREEN]: 20,
  [FOCUS_MODES.MAIN]: 90,
  [`${FOCUS_MODES.MAIN}:${DAY_TYPES.LONG}`]: 90,
  [`${FOCUS_MODES.MAIN}:${DAY_TYPES.SHORT}`]: 120,
  [`${FOCUS_MODES.MAIN}:${DAY_TYPES.FREE}`]: 60,
  [`${FOCUS_MODES.MAIN}:${DAY_TYPES.SUNDAY}`]: 0,
  [FOCUS_MODES.SIDE]: 40,
  [FOCUS_MODES.SHUTDOWN]: 5,
  [FOCUS_MODES.OPEN_GOAL]: 90,
};

export const WEEKLY_DEFAULTS = {
  WSO_DEEP_WORK_HOURS: 8,
  CASH_SESSIONS: 4,
  FREELANCE_MAX_HOURS: 4,
  GYM_SESSIONS: 2,
};

export const WEEKDAY_DAY_TYPES = {
  0: DAY_TYPES.SUNDAY,
  1: DAY_TYPES.LONG,
  2: DAY_TYPES.SHORT,
  3: DAY_TYPES.LONG,
  4: DAY_TYPES.SHORT,
  5: DAY_TYPES.LONG,
  6: DAY_TYPES.FREE,
};

export const BLOCKED_SUNDAY_AREAS = new Set(["WSO", "Freelance", "Admin"]);
export const BLOCKED_SUNDAY_WORK_TYPES = new Set(["Cash", "Asset"]);

export const DEFAULT_TASK_VALUES = {
  area: "WSO",
  work_type: "Cash",
  block_type: "Green Work",
  energy_required: "Medium",
  estimated_minutes: 45,
};
