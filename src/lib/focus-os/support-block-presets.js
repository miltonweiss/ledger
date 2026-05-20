import { DAY_TYPES, getCapacityBudgetMinutes } from "./constants.js";

export const SUPPORT_PRESETS = [
  {
    id: "gym",
    title: "Gym / Movement",
    area: "Body",
    workType: "Recovery",
    defaultDurationMinutes: 75,
    energy: "Medium",
    allowedDayTypes: [DAY_TYPES.LONG, DAY_TYPES.SHORT, DAY_TYPES.FREE, DAY_TYPES.SUNDAY],
    defaultDoD: "Training done or 30 minutes of movement completed.",
    countsAsWorkCapacity: false,
    type: "Recovery / Körper"
  },
  {
    id: "light-admin",
    title: "Light Admin",
    area: "Admin",
    workType: "Maintenance",
    defaultDurationMinutes: 30,
    energy: "Low",
    allowedDayTypes: [DAY_TYPES.LONG, DAY_TYPES.SHORT, DAY_TYPES.FREE],
    defaultDoD: "1–3 small open items closed (Email, file sorting, or calendar check).",
    countsAsWorkCapacity: true,
    type: "Ordnung"
  },
  {
    id: "school-maintenance",
    title: "School Maintenance",
    area: "School",
    workType: "Maintenance",
    defaultDurationMinutes: 45,
    energy: "Medium",
    allowedDayTypes: [DAY_TYPES.LONG, DAY_TYPES.SHORT, DAY_TYPES.FREE],
    defaultDoD: "One concrete school task finished or 30 min learning.",
    countsAsWorkCapacity: true,
    type: "Schule"
  },
  {
    id: "freelance-mini",
    title: "Freelance Mini",
    area: "Freelance",
    workType: "Cash",
    defaultDurationMinutes: 60,
    energy: "Medium",
    allowedDayTypes: [DAY_TYPES.SHORT, DAY_TYPES.FREE],
    defaultDoD: "One small paid task completed.",
    countsAsWorkCapacity: true,
    type: "Freelance"
  },
  {
    id: "shutdown",
    title: "Shutdown",
    area: "Body",
    workType: "Recovery",
    defaultDurationMinutes: 15,
    energy: "Low",
    allowedDayTypes: [DAY_TYPES.LONG, DAY_TYPES.SHORT, DAY_TYPES.FREE, DAY_TYPES.SUNDAY],
    defaultDoD: "Morgen geplant, heute geschlossen, Erfolge notiert.",
    countsAsWorkCapacity: false,
    type: "Sicherheit"
  },
  {
    id: "recovery",
    title: "Recovery / Nothing Useful",
    area: "Body",
    workType: "Recovery",
    defaultDurationMinutes: 60,
    energy: "Low",
    allowedDayTypes: [DAY_TYPES.LONG, DAY_TYPES.SHORT, DAY_TYPES.FREE, DAY_TYPES.SUNDAY],
    defaultDoD: "Consciously did not work.",
    countsAsWorkCapacity: false,
    type: "Erholung"
  },
  {
    id: "weekly-review",
    title: "Weekly Review / Planning",
    area: "Admin",
    workType: "Maintenance",
    defaultDurationMinutes: 60,
    energy: "Medium",
    allowedDayTypes: [DAY_TYPES.SHORT, DAY_TYPES.FREE],
    defaultDoD: "Week reviewed and next week planned.",
    countsAsWorkCapacity: true,
    type: "System"
  }
];

export function getSupportPresetById(id) {
  return SUPPORT_PRESETS.find((preset) => preset.id === id) || null;
}

export function buildSupportPresetTask(preset) {
  if (!preset) return null;

  return {
    id: `preset:${preset.id}`,
    preset_id: preset.id,
    name: preset.title,
    area: preset.area,
    work_type: preset.workType,
    energy_required: preset.energy,
    estimated_minutes: preset.defaultDurationMinutes,
    block_type: "Side Block",
    definition_of_done: preset.defaultDoD,
    isPreset: true,
  };
}

export function getRemainingCapacityMinutes({ dayType, mainTask }) {
  const availableMinutes = getCapacityBudgetMinutes(dayType);
  const mainDuration = mainTask?.estimated_minutes || 0;
  return Math.max(0, availableMinutes - mainDuration);
}

export function getRecommendedSupportPresets({ dayType, weekday, mainTask }) {
  const remainingCapacity = getRemainingCapacityMinutes({ dayType, mainTask });
  const isCapacityTight = remainingCapacity < 60;
  const isGymDay = ["Tuesday", "Friday", "Sunday"].includes(weekday);

  let allowed = SUPPORT_PRESETS.filter(preset => {
    // 1. Check if allowed on this day type
    if (!preset.allowedDayTypes.includes(dayType)) return false;

    // 2. Capacity rules
    if (isCapacityTight && preset.countsAsWorkCapacity) {
      // If capacity is tight, only allow non-work or very light recovery
      return ["shutdown", "recovery", "gym"].includes(preset.id);
    }

    // 3. Special rules for Long Day
    if (dayType === DAY_TYPES.LONG) {
      // Long days only allow light/recovery or school maintenance
      return ["gym", "light-admin", "shutdown", "recovery", "school-maintenance"].includes(preset.id);
    }

    return true;
  });

  if (isGymDay) {
    const gymPreset = allowed.find(p => p.id === "gym");
    if (gymPreset) {
      allowed = [gymPreset, ...allowed.filter(p => p.id !== "gym")];
    }
  }

  return allowed;
}
