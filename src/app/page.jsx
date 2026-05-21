"use client";

import TodayCommandBar from "@/components/focus-os/TodayCommandBar";
import MainBlockCard from "@/components/focus-os/MainBlockCard";
import SupportBlockCard from "@/components/focus-os/SupportBlockCard";
import WeeklyScoreCard from "@/components/focus-os/WeeklyScoreCard";
import NotTodayList from "@/components/focus-os/NotTodayList";
import DailyLevelPanel from "@/components/focus-os/DailyLevelPanel";
import FocusTimerModal from "@/components/focus-os/FocusTimerModal";
import ShutdownModal from "@/components/focus-os/ShutdownModal";
import { DAY_TYPES, FOCUS_MODES, getCapacityBudgetMinutes } from "@/lib/focus-os/constants.js";
import { calculateCapacityMode } from "@/lib/focus-os/day.js";
import { getTodayFocusState, updateDailyLog } from "@/lib/supabase/focus-os";
import { buildSupportPresetTask, getRecommendedSupportPresets, getSupportPresetById } from "@/lib/focus-os/support-block-presets.js";
import { buildTodayRecommendation } from "@/lib/focus-os/recommendation.js";
import { validateDefinitionOfDone } from "@/lib/focus-os/validation.js";
import { getCutTaskIds, getMainBlockTaskId, getSideBlockTaskId, taskSelectionUpdates } from "@/lib/focus-os/task-refs.js";
import ClarifyTaskModal from "@/components/focus-os/ClarifyTaskModal";
import { useEffect, useMemo, useState } from "react";

const FOCUS_SYNC_EVENT = "focus-os-daily-log-updated";

// ─── Skeleton ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", padding: "0.5rem" }}>
      <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "0.875rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div className="skeleton" style={{ height: "220px", borderRadius: "14px" }} />
          <div className="skeleton" style={{ height: "100px", borderRadius: "14px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div className="skeleton" style={{ height: "130px", borderRadius: "14px" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerConfig, setTimerConfig] = useState(null);
  const [clarifyTask, setClarifyTask] = useState(null);

  async function refresh() {
    setLoading(true);
    const next = await getTodayFocusState();
    setState(next);
    setLoading(false);
    return next;
  }

  function broadcastFocusState(next) {
    window.dispatchEvent(new CustomEvent(FOCUS_SYNC_EVENT, { detail: { state: next } }));
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await getTodayFocusState();
      if (cancelled) return;
      setState(next);
      setLoading(false);
    }

    function handleFocusSync(event) {
      if (event.detail?.state) {
        setState(event.detail.state);
        setLoading(false);
        return;
      }

      load();
    }

    load();
    window.addEventListener(FOCUS_SYNC_EVENT, handleFocusSync);

    return () => {
      cancelled = true;
      window.removeEventListener(FOCUS_SYNC_EVENT, handleFocusSync);
    };
  }, []);

  const activeTasks = useMemo(
    () => (state?.tasks || []).filter((t) => !t.done && !t.killed_at),
    [state],
  );

  if (loading) return <DashboardSkeleton />;

  if (!state?.dailyLog) {
    return (
      <div style={{ padding: "0.5rem" }}>
        <div className="dash-card">
          <h3 style={{ margin: 0 }}>Focus OS tables are missing.</h3>
          <p>Run the Supabase migration in <code>supabase/migrations/001_focus_os.sql</code>, then reload.</p>
        </div>
      </div>
    );
  }

  const { dailyLog, weeklyScore, recommendation } = state;
  const mainTaskId = getMainBlockTaskId(dailyLog);
  const sideTaskId = getSideBlockTaskId(dailyLog);
  const selectedMainTask = activeTasks.find((task) => task.id === mainTaskId) || null;
  const selectedSupportTask = activeTasks.find((task) => task.id === sideTaskId) || null;
  const selectedSupportPreset = getSupportPresetById(dailyLog.support_preset_id);
  const selectedSupportPresetTask = buildSupportPresetTask(selectedSupportPreset);
  const recommendedMainTask = dailyLog.skip_main_block || recommendation?.mainBlock?.id === sideTaskId
    ? null
    : recommendation?.mainBlock || null;
  const mainTask = dailyLog.skip_main_block ? null : selectedMainTask || recommendedMainTask;
  const sideTask = selectedSupportTask || selectedSupportPresetTask || recommendation?.sideBlock || null;
  const cutTasks = state.cutTasks?.length ? state.cutTasks : recommendation?.cut || [];
  const isSunday = dailyLog.day_type === DAY_TYPES.SUNDAY;
  
  const mode = dailyLog.mode || 'plan';

  async function handleDailyLogUpdate(updates) {
    const nextCapacityMode = calculateCapacityMode({
      dayType:       updates.day_type        || dailyLog.day_type,
      energy:        updates.energy_am       ?? dailyLog.energy_am,
      guilt:         updates.guilt_am        ?? dailyLog.guilt_am,
      mood:          updates.mood_am         ?? dailyLog.mood_am,
      stress:        updates.stress_am       ?? dailyLog.stress_am,
      sleep:         updates.sleep_quality   ?? dailyLog.sleep_quality,
      recovery:      updates.recovery_level  ?? dailyLog.recovery_level,
      mainBlockDone: updates.main_block_done ?? dailyLog.main_block_done,
      shutdownDone:  updates.shutdown_done   ?? dailyLog.shutdown_done,
      override:      updates.status_override ?? dailyLog.status_override,
    });
    const updatedDailyLog = { ...dailyLog, ...updates, capacity_mode: nextCapacityMode };
    const nextRecommendation = buildTodayRecommendation(state.tasks || [], {
      today: state.date,
      dayType: updatedDailyLog.day_type,
      capacityMode: nextCapacityMode,
    });
    const nextState = {
      ...state,
      dailyLog: updatedDailyLog,
      recommendation: nextRecommendation,
      mainTask: (state.tasks || []).find((task) => task.id === getMainBlockTaskId(updatedDailyLog)) || null,
      sideTask: (state.tasks || []).find((task) => task.id === getSideBlockTaskId(updatedDailyLog)) || null,
      cutTasks: (state.tasks || []).filter((task) => getCutTaskIds(updatedDailyLog).includes(task.id)),
    };

    setState(nextState);
    broadcastFocusState(nextState);

    const savedDailyLog = await updateDailyLog(dailyLog.id, { ...updates, capacity_mode: nextCapacityMode });
    if (savedDailyLog) {
      const savedState = { ...nextState, dailyLog: { ...updatedDailyLog, ...savedDailyLog } };
      setState(savedState);
      broadcastFocusState(savedState);
    }
  }

  async function handlePresetClick(preset) {
    await handleDailyLogUpdate({
      support_preset_id: preset.id,
      ...taskSelectionUpdates("side", null),
      side_block_done: false,
    });
  }

  async function handleMainSelect(id) {
    if (id === "nothing") {
      await handleDailyLogUpdate({ ...taskSelectionUpdates("main", null), skip_main_block: true });
      return;
    }

    await handleDailyLogUpdate({
      ...taskSelectionUpdates("main", id || null),
      skip_main_block: false,
      ...(id && id === sideTaskId ? taskSelectionUpdates("side", null) : {}),
    });
  }

  const showCloseDay = Boolean(dailyLog.main_block_done || mainTask?.done) || Boolean(getCutTaskIds(dailyLog).length > 0 && !mainTaskId);

  const supportPresets = dailyLog && state
    ? getRecommendedSupportPresets({
      dayType: dailyLog.day_type,
      weekday: state.weekday,
      mainTask
    })
    : [];

  const commitValidation = (() => {
    const mainDoD = mainTask ? validateDefinitionOfDone(mainTask.definition_of_done) : { valid: true };
    const sideDoD = sideTask && !sideTask.isPreset ? validateDefinitionOfDone(sideTask.definition_of_done) : { valid: true };
    
    const capacityLimitMinutes = getCapacityBudgetMinutes(dailyLog.day_type);
    const totalPlanned = (mainTask?.estimated_minutes || 0) + (sideTask?.estimated_minutes || 0);
    const overCapacity = totalPlanned > capacityLimitMinutes;

    return {
      valid: mainDoD.valid && sideDoD.valid && !overCapacity,
      mainError: !mainDoD.valid ? mainDoD.reason : null,
      sideError: !sideDoD.valid ? sideDoD.reason : null,
      capacityError: overCapacity ? `Total planned (${totalPlanned}m) exceeds ${dailyLog.day_type} capacity (${capacityLimitMinutes}m).` : null
    };
  })();

  if (isSunday) {
    return (
      <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <TodayCommandBar
          date={state.date}
          weekday={state.weekday}
          dailyLog={dailyLog}
        />
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Sunday is protected</div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <p>Today counts as won if you do not work. Body, relationships, and real rest are the priority.</p>
            <p style={{ marginTop: "1rem" }}>Work tasks are blocked today.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <TodayCommandBar
        date={state.date}
        weekday={state.weekday}
        dailyLog={dailyLog}
      />

      {mode === 'plan' && (
        <div className="dash-grid dash-stagger-enter">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <MainBlockCard
              task={mainTask}
              tasks={activeTasks}
              selectedId={dailyLog.skip_main_block ? "nothing" : mainTaskId || ""}
              onSelect={handleMainSelect}
              onStart={() => setTimerConfig({ task: mainTask, mode: FOCUS_MODES.MAIN })}
            />
            <SupportBlockCard
              task={sideTask}
              tasks={activeTasks}
              selectedId={sideTaskId || ""}
              selectedPresetId={dailyLog.support_preset_id || ""}
              onSelect={(id) => handleDailyLogUpdate({ ...taskSelectionUpdates("side", id || null), support_preset_id: null, side_block_done: false })}
              onStart={() => setTimerConfig({ task: sideTask, mode: FOCUS_MODES.SIDE })}
              presets={supportPresets}
              onPresetClick={handlePresetClick}
              dayType={dailyLog.day_type}
            />

            {!commitValidation.valid && (
              <div style={{ fontSize: "0.8rem", color: "var(--red-accent)", textAlign: "center", padding: "0.5rem 1rem" }}>
                {commitValidation.mainError && `Main: ${commitValidation.mainError}`}
                {commitValidation.sideError && `Support: ${commitValidation.sideError}`}
                {commitValidation.capacityError && commitValidation.capacityError}
              </div>
            )}
          </div>
          
          <div className="dash-card-right-col">
            <DailyLevelPanel dailyLog={dailyLog} onUpdate={handleDailyLogUpdate} />
            <NotTodayList cutTasks={cutTasks} />
            
            {recommendation?.needsClarification?.length > 0 && (
              <div className="dash-card" style={{ borderColor: "var(--yellow-accent)", borderStyle: "dashed" }}>
                <div className="dash-card-header">
                  <div className="dash-card-title" style={{ color: "var(--yellow-accent)" }}>Needs Clarification</div>
                </div>
                <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  These tasks are missing required fields (Area, Work Type, Estimate, Energy, DoD) and cannot be planned.
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {recommendation.needsClarification.slice(0, 5).map(task => (
                    <li key={task.id} className="clarify-task-row">
                      <span className="clarify-task-name">{task.name}</span>
                      <button className="clarify-task-btn" onClick={() => setClarifyTask(task)}>
                        Clarify
                      </button>
                    </li>
                  ))}
                  {recommendation.needsClarification.length > 5 && (
                    <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.25rem" }}>
                      + {recommendation.needsClarification.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}

      {mode === 'execute' && (
        <div className="dash-stagger-enter" style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <MainBlockCard
            task={mainTask}
            tasks={activeTasks}
            selectedId={dailyLog.skip_main_block ? "nothing" : mainTaskId || ""}
            onSelect={handleMainSelect}
            onStart={() => setTimerConfig({ task: mainTask, mode: FOCUS_MODES.MAIN })}
          />
          {sideTask && (
            <SupportBlockCard
              task={sideTask}
              tasks={activeTasks}
              selectedId={sideTaskId || ""}
              selectedPresetId={dailyLog.support_preset_id || ""}
              onSelect={(id) => handleDailyLogUpdate({ ...taskSelectionUpdates("side", id || null), support_preset_id: null, side_block_done: false })}
              onStart={() => setTimerConfig({ task: sideTask, mode: FOCUS_MODES.SIDE })}
              presets={supportPresets}
              onPresetClick={handlePresetClick}
              dayType={dailyLog.day_type}
            />
          )}
          {showCloseDay && (
            <button className="dash-btn-accent" style={{ padding: "1rem", fontSize: "1rem", marginTop: "1rem", backgroundColor: "var(--text-main)", color: "var(--bg-main)" }} onClick={() => handleDailyLogUpdate({ mode: 'shutdown' })}>
              Close Day
            </button>
          )}
        </div>
      )}

      {mode === 'shutdown' && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <ShutdownModal
            dailyLog={dailyLog}
            onSaved={async () => {
              await handleDailyLogUpdate({ mode: 'closed' });
            }}
          />
        </div>
      )}

      {mode === 'closed' && (
        <div className="dash-stagger-enter" style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <div className="dash-card dash-card-interactive" style={{ textAlign: "center", padding: "2rem" }}>
            <h2 style={{ marginBottom: "1rem" }}>Day Closed</h2>
            <p style={{ color: "var(--text-muted)" }}>Heute geschlossen. Nächster Schritt ist gespeichert.</p>
            {state.shutdown?.next_step && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
                <strong>Next Step:</strong> {state.shutdown.next_step}
              </div>
            )}
            
            <button className="dash-btn-ghost" style={{ marginTop: "2rem" }} onClick={() => {
              const reason = prompt("Override requires reason:");
              if (reason) {
                handleDailyLogUpdate({ mode: 'plan', reopen_reason: reason });
              }
            }}>
              Reopen Day
            </button>
          </div>
          <WeeklyScoreCard weeklyScore={weeklyScore} />
        </div>
      )}

      {timerConfig && (
        <FocusTimerModal
          open
          task={timerConfig.task}
          dailyLog={dailyLog}
          dayType={dailyLog.day_type}
          mode={timerConfig.mode || FOCUS_MODES.GREEN}
          onClose={() => setTimerConfig(null)}
          onSaved={refresh}
        />
      )}

      {clarifyTask && (
        <ClarifyTaskModal
          task={clarifyTask}
          onClose={() => setClarifyTask(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  );
}
