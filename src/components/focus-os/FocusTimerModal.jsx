"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Pause, Play, ShieldAlert, X } from "lucide-react";
import { DAY_TYPES, FOCUS_MODES } from "@/lib/focus-os/constants.js";
import { getNextMonday, getTimerDefault, isSundayBlockedTask } from "@/lib/focus-os/day.js";
import { getGoalItemsFromDefinition, suggestDefinitionOfDone, validateDefinitionOfDone, getPlainTextFromDefinition } from "@/lib/focus-os/validation.js";
import { finishFocusSession, startFocusSession } from "@/lib/supabase/focus-os";
import { updateTodo } from "@/lib/supabase/todo";
import { greenToast, redToast, yellowToast } from "@/components/toasts";

export default function FocusTimerModal({
  open,
  task,
  dailyLog,
  mode = FOCUS_MODES.GREEN,
  dayType,
  onClose,
  onSaved,
}) {
  const defaultMinutes = useMemo(() => {
    if (!task) return getTimerDefault(mode, dayType);
    return Number(task.estimated_minutes || 0) || getTimerDefault(mode, dayType);
  }, [task, mode, dayType]);

  const [plannedMinutes, setPlannedMinutes] = useState(defaultMinutes);
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(null);
  const [goalItems, setGoalItems] = useState(() => getGoalItemsFromDefinition(task?.definition_of_done || task?.name || ""));
  const [definition, setDefinition] = useState(() => getPlainTextFromDefinition(task?.definition_of_done || ""));
  const [savingDefinition, setSavingDefinition] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const blockedBySunday = dayType === DAY_TYPES.SUNDAY && task && isSundayBlockedTask(task);
  const definitionCheck = validateDefinitionOfDone(definition);
  const requiresDefinition = mode === FOCUS_MODES.MAIN && !definitionCheck.valid;
  const allGoalItemsDone = goalItems.length > 0 && goalItems.every((item) => item.done);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const actualMinutes = Math.max(1, plannedMinutes - Math.ceil(secondsLeft / 60));

  async function handleStart() {
    if (blockedBySunday) {
      yellowToast("Sunday protected", "This work is moved to Monday instead of started.");
      return;
    }

    if (requiresDefinition) {
      redToast("Definition of Done needed", definitionCheck.reason);
      return;
    }

    if (!session) {
      const created = await startFocusSession({
        task,
        dailyLogId: dailyLog?.id,
        mode: allGoalItemsDone ? FOCUS_MODES.OPEN_GOAL : mode,
        plannedMinutes,
        goalItems,
      });
      if (!created) return;
      setSession(created);
    }

    setRunning(true);
  }

  async function handleDone() {
    let activeSession = session;
    if (!activeSession) {
      activeSession = await startFocusSession({
        task,
        dailyLogId: dailyLog?.id,
        mode,
        plannedMinutes,
        goalItems,
      });
      if (!activeSession) return;
    }

    await finishFocusSession({
      sessionId: activeSession.id,
      task,
      dailyLog,
      actualMinutes,
      goalItems,
      markDone: Boolean(task?.id),
    });

    setRunning(false);
    greenToast("Focus logged", "Task, time, and block state were saved.");
    onSaved?.();
    onClose?.();
  }

  async function handleSaveDefinition(value) {
    if (!task?.id) return;
    setSavingDefinition(true);
    const updated = await updateTodo(task.id, { definition_of_done: value });
    setSavingDefinition(false);
    if (updated) {
      setDefinition(updated.definition_of_done || value);
      setGoalItems(getGoalItemsFromDefinition(updated.definition_of_done || value));
      greenToast("Definition saved", "This task is now clear enough to run.");
      onSaved?.();
    }
  }

  async function handleMoveToMonday() {
    if (!task?.id) return;
    const monday = getNextMonday();
    const updated = await updateTodo(task.id, { due: monday });
    if (updated) {
      yellowToast("Moved to Monday", "Protected Sunday stays protected.");
      onSaved?.();
      onClose?.();
    }
  }

  return createPortal(
    <div 
      className="focus-modal-backdrop" 
      role="dialog" 
      aria-modal="true"
      onClick={onClose}
    >
      <div className="focus-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm deemphasize">{mode}</p>
            <h2 className="text-3xl">{task?.name || "Focus block"}</h2>
          </div>
          <button className="ghost-btn" onClick={onClose} aria-label="Close focus timer">
            <X size={18} />
          </button>
        </div>

        {blockedBySunday ? (
          <div className="focus-warning">
            <ShieldAlert />
            <div>
              <h4>Blocked. Sunday is protected.</h4>
              <p>This task belongs on Monday, not in recovery time.</p>
            </div>
          </div>
        ) : null}

        <div className="focus-goal">
          <p className="text-xs uppercase deemphasize">Goal</p>
          <textarea
            value={definition}
            onChange={(event) => setDefinition(event.target.value)}
            onBlur={() => {
              if (definition !== getPlainTextFromDefinition(task?.definition_of_done)) handleSaveDefinition(definition);
            }}
            className="focus-textarea"
            rows={3}
            placeholder="What exactly is done when this is done?"
          />
          {requiresDefinition ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: "var(--red-accent)" }}>{definitionCheck.reason}</p>
              <div className="flex flex-wrap gap-2">
                {suggestDefinitionOfDone(task).map((suggestion) => (
                  <button
                    key={suggestion}
                    className="ghost-btn text-sm"
                    disabled={savingDefinition}
                    onClick={() => handleSaveDefinition(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {goalItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {goalItems.map((item, index) => (
              <label key={`${item.label}-${index}`} className="focus-check-row cursor-pointer">
                <div className="custom-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={item.done}
                    className="peer sr-only"
                    onChange={(event) => {
                      setGoalItems((items) =>
                        items.map((goal, goalIndex) =>
                          goalIndex === index ? { ...goal, done: event.target.checked } : goal,
                        ),
                      );
                    }}
                  />
                  <div className={`custom-checkbox ${item.done ? "checked" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" className="check-path"></path>
                    </svg>
                  </div>
                </div>
                <span>{item.label}</span>
              </label>
            ))}
            {allGoalItemsDone ? (
              <p className="text-sm" style={{ color: "var(--green-accent)" }}>
                Goal reached. You may stop.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="focus-timer-display">
          <span className={`timer-digit ${minutes !== Math.floor((secondsLeft + 1) / 60) ? 'timer-digit-changed' : ''}`} key={`m-${minutes}`}>
            {String(minutes).padStart(2, "0")}
          </span>
          :
          <span className={`timer-digit ${seconds !== (secondsLeft + 1) % 60 ? 'timer-digit-changed' : ''}`} key={`s-${seconds}`}>
            {String(seconds).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm deemphasize">
              Minutes
              <input
                type="number"
                min="5"
                max="180"
                value={plannedMinutes}
                disabled={Boolean(session)}
                onChange={(event) => {
                  const next = Number(event.target.value || 5);
                  setPlannedMinutes(next);
                  setSecondsLeft(next * 60);
                }}
                className="focus-number-input"
              />
            </label>
        </div>

        <div className="focus-modal-actions">
          {blockedBySunday ? (
            <button className="accent-btn" onClick={handleMoveToMonday}>Move to Monday</button>
          ) : (
            <>
              <button className="accent-btn" onClick={handleStart} disabled={running || requiresDefinition}>
                <Play size={16} />
                Start
              </button>
              <button className="ghost-btn" onClick={() => setRunning(false)} disabled={!running}>
                <Pause size={16} />
                Pause
              </button>
              <button className="ghost-btn" onClick={handleDone} disabled={requiresDefinition}>
                <CheckCircle2 size={16} />
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
