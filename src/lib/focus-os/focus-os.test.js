import test from "node:test";
import assert from "node:assert/strict";
import { CAPACITY_MODE, DAY_TYPES, getCapacityBudgetMinutes } from "./constants.js";
import { calculateCapacityMode, canStopToday, getDefaultDayType, isSundayBlockedTask } from "./day.js";
import { buildTodayRecommendation } from "./recommendation.js";
import { calculateWeeklyScore, detectFakeWork } from "./score.js";
import { validateDefinitionOfDone } from "./validation.js";
import { getRecommendedSupportPresets, getRemainingCapacityMinutes } from "./support-block-presets.js";

test("default day types follow the balanced week", () => {
  assert.equal(getDefaultDayType("2026-05-18T12:00:00"), DAY_TYPES.LONG);
  assert.equal(getDefaultDayType("2026-05-19T12:00:00"), DAY_TYPES.SHORT);
  assert.equal(getDefaultDayType("2026-05-20T12:00:00"), DAY_TYPES.SHORT);
  assert.equal(getDefaultDayType("2026-05-23T12:00:00"), DAY_TYPES.FREE);
  assert.equal(getDefaultDayType("2026-05-24T12:00:00"), DAY_TYPES.SUNDAY);
});

test("day status respects recovery inputs and overrides", () => {
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 8 }), CAPACITY_MODE.FULL);
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 2 }), CAPACITY_MODE.PROTECTED);
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, override: CAPACITY_MODE.LIMITED }), CAPACITY_MODE.LIMITED);
});

test("recommendation prefers concrete WSO cash work", () => {
  const tasks = [
    { id: "1", name: "Rebuild notes", priority: "Important", area: "Admin", work_type: "Maintenance", energy_required: "Low", estimated_minutes: 30, definition_of_done: "Notes rebuilt and saved." },
    { id: "2", name: "Outreach", priority: "Average", area: "WSO", work_type: "Cash", block_type: "Main Block", energy_required: "Medium", estimated_minutes: 60, definition_of_done: "Review 10 leads and send 5 outreach messages" },
  ];

  const recommendation = buildTodayRecommendation(tasks, {
    today: "2026-05-18",
    dayType: DAY_TYPES.LONG,
    status: CAPACITY_MODE.FULL,
  });

  assert.equal(recommendation.mainBlock.id, "2");
});

test("stop permission requires main block, shutdown, and next step", () => {
  const result = canStopToday({
    dailyLog: { main_block_done: true, shutdown_done: true, day_type: DAY_TYPES.LONG },
    shutdown: { next_step: "Send 5 follow-ups", next_step_date: "2026-05-19" },
    dayType: DAY_TYPES.LONG,
  });

  assert.equal(result.allowed, true);
});

test("sunday lock blocks cash and asset work", () => {
  assert.equal(isSundayBlockedTask({ area: "WSO", work_type: "Cash" }), true);
  assert.equal(isSundayBlockedTask({ area: "Body", work_type: "Recovery" }), false);
});

test("fake work detector warns when asset/admin dominates cash", () => {
  const sessions = [
    { completed: true, task: { work_type: "Asset", area: "Admin" } },
    { completed: true, task: { work_type: "Maintenance", area: "Admin" } },
    { completed: true, task: { work_type: "Asset", area: "WSO" } },
  ];

  assert.equal(detectFakeWork(sessions).active, true);
});

test("definition of done rejects vague work", () => {
  assert.equal(validateDefinitionOfDone("do WSO").valid, false);
  assert.equal(validateDefinitionOfDone("Review 10 leads and send 5 outreach messages").valid, true);
});

test("weekly score counts completed sessions", () => {
  const score = calculateWeeklyScore({
    sessions: [
      { completed: true, actual_minutes: 90, task: { area: "WSO", work_type: "Cash" } },
      { completed: true, actual_minutes: 45, task: { area: "Body", work_type: "Recovery" } },
    ],
    dailyLogs: [],
  });

  assert.equal(score.wsoHours, 1.5);
  assert.equal(score.cashSessions, 1);
  assert.equal(score.gymSessions, 1);
});

test("support block presets filtering logic", () => {
  // Long Day: only light/recovery/school
  const longDayPresets = getRecommendedSupportPresets({ dayType: DAY_TYPES.LONG });
  assert.ok(longDayPresets.some(p => p.id === "gym"));
  assert.ok(!longDayPresets.some(p => p.id === "reading-input")); // removed
  assert.ok(!longDayPresets.some(p => p.id === "freelance-mini"));

  // Short Day: allows work presets
  const shortDayPresets = getRecommendedSupportPresets({ dayType: DAY_TYPES.SHORT });
  assert.ok(shortDayPresets.some(p => p.id === "freelance-mini"));
  assert.ok(!shortDayPresets.some(p => p.id === "outreach-followup")); // removed

  // Capacity Tight: only recovery
  const tightPresets = getRecommendedSupportPresets({ 
    dayType: DAY_TYPES.SHORT, 
    mainTask: { estimated_minutes: 110 } // Capacity is 120
  });
  assert.ok(tightPresets.some(p => p.id === "shutdown"));
  assert.ok(!tightPresets.some(p => p.id === "freelance-mini"));

  // Sunday: no work
  const sundayPresets = getRecommendedSupportPresets({ dayType: DAY_TYPES.SUNDAY });
  assert.ok(!sundayPresets.some(p => p.area === "WSO"));
  assert.ok(!sundayPresets.some(p => p.area === "Freelance"));
  assert.ok(sundayPresets.some(p => p.id === "gym"));
});

test("remaining capacity calculation", () => {
  const longBudget = getCapacityBudgetMinutes(DAY_TYPES.LONG);
  const shortBudget = getCapacityBudgetMinutes(DAY_TYPES.SHORT);

  assert.equal(getRemainingCapacityMinutes({ dayType: DAY_TYPES.LONG, mainTask: { estimated_minutes: 90 } }), Math.max(0, longBudget - 90));
  assert.equal(getRemainingCapacityMinutes({ dayType: DAY_TYPES.SHORT, mainTask: { estimated_minutes: 75 } }), Math.max(0, shortBudget - 75));
  assert.equal(getRemainingCapacityMinutes({ dayType: DAY_TYPES.SHORT, mainTask: { estimated_minutes: 130 } }), 0);
});

test("support block cannot appear as main block by fallback", () => {
  const tasks = [
    { id: "1", name: "Gym", block_type: "Side Block", energy_required: "Low", estimated_minutes: 60, definition_of_done: "Finish 1 workout", area: "Body", work_type: "Recovery" },
    { id: "2", name: "Outreach", block_type: "Main Block", energy_required: "High", estimated_minutes: 90, definition_of_done: "Send 5 outreach messages", area: "WSO", work_type: "Cash" },
  ];
  const rec = buildTodayRecommendation(tasks, { today: "2026-05-18", dayType: DAY_TYPES.LONG, capacityMode: CAPACITY_MODE.FULL });
  assert.equal(rec.mainBlock.id, "2");
  assert.equal(rec.sideBlock.id, "1");

  // If there's only a side block, main block should be null
  const recOnlySide = buildTodayRecommendation([tasks[0]], { today: "2026-05-18", dayType: DAY_TYPES.LONG, capacityMode: CAPACITY_MODE.FULL });
  assert.equal(recOnlySide.mainBlock, null);
});

test("weekday gym suggestions prioritize gym on Tuesday, Friday, Sunday", () => {
  const tuesdayPresets = getRecommendedSupportPresets({ dayType: DAY_TYPES.LONG, weekday: "Tuesday" });
  assert.equal(tuesdayPresets[0].id, "gym");
});

test("low-energy behavior restricts capacity mode", () => {
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 3, stress: 5, sleep: 8 }), CAPACITY_MODE.PROTECTED);
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 8, stress: 8, sleep: 8 }), CAPACITY_MODE.PROTECTED);
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 8, stress: 5, sleep: 2 }), CAPACITY_MODE.PROTECTED);
  assert.equal(calculateCapacityMode({ dayType: DAY_TYPES.LONG, energy: 8, stress: 5, sleep: 8 }), CAPACITY_MODE.FULL);
});
