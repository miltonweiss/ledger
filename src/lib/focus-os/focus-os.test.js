import test from "node:test";
import assert from "node:assert/strict";
import { DAY_STATUSES, DAY_TYPES } from "./constants.js";
import { calculateDayStatus, canStopToday, getDefaultDayType, isSundayBlockedTask } from "./day.js";
import { buildTodayRecommendation } from "./recommendation.js";
import { calculateWeeklyScore, detectFakeWork } from "./score.js";
import { validateDefinitionOfDone } from "./validation.js";

test("default day types follow the balanced week", () => {
  assert.equal(getDefaultDayType("2026-05-18T12:00:00"), DAY_TYPES.LONG);
  assert.equal(getDefaultDayType("2026-05-19T12:00:00"), DAY_TYPES.SHORT);
  assert.equal(getDefaultDayType("2026-05-23T12:00:00"), DAY_TYPES.FREE);
  assert.equal(getDefaultDayType("2026-05-24T12:00:00"), DAY_TYPES.SUNDAY);
});

test("day status respects recovery inputs and overrides", () => {
  assert.equal(calculateDayStatus({ dayType: DAY_TYPES.LONG, energy: 8 }), DAY_STATUSES.GROWTH);
  assert.equal(calculateDayStatus({ dayType: DAY_TYPES.LONG, energy: 2 }), DAY_STATUSES.RECOVERY);
  assert.equal(calculateDayStatus({ dayType: DAY_TYPES.LONG, override: DAY_STATUSES.STABILITY }), DAY_STATUSES.STABILITY);
});

test("recommendation prefers concrete WSO cash work", () => {
  const tasks = [
    { id: "1", name: "Rebuild notes", priority: "Important", area: "Admin", work_type: "Maintenance", energy_required: "Low" },
    { id: "2", name: "Outreach", priority: "Average", area: "WSO", work_type: "Cash", block_type: "Main Block", energy_required: "Medium", definition_of_done: "Review 10 leads and send 5 outreach messages" },
  ];

  const recommendation = buildTodayRecommendation(tasks, {
    today: "2026-05-18",
    dayType: DAY_TYPES.LONG,
    status: DAY_STATUSES.GROWTH,
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
