"use client";

import TodayCommandBar from "@/components/focus-os/TodayCommandBar";
import MainBlockCard from "@/components/focus-os/MainBlockCard";
import SideBlockCard from "@/components/focus-os/SideBlockCard";
import WeeklyScoreCard from "@/components/focus-os/WeeklyScoreCard";
import AIOperatorCard from "@/components/focus-os/AIOperatorCard";
import NotTodayList from "@/components/focus-os/NotTodayList";
import StopPermissionModal from "@/components/focus-os/StopPermissionModal";
import FocusTimerModal from "@/components/focus-os/FocusTimerModal";
import ShutdownModal from "@/components/focus-os/ShutdownModal";
import FocusProposalCard from "@/components/focus-os/FocusProposalCard";
import { CAPACITY_MODE, DAY_TYPES, FOCUS_MODES } from "@/lib/focus-os/constants.js";
import { buildTaskCleanerProposal } from "@/lib/focus-os/recommendation.js";
import { calculateCapacityMode } from "@/lib/focus-os/day.js";
import { getTodayFocusState, updateDailyLog } from "@/lib/supabase/focus-os";
import { useEffect, useMemo, useState } from "react";

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
  const [proposal, setProposal] = useState(null);

  async function refresh() {
    setLoading(true);
    const next = await getTodayFocusState();
    setState(next);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await getTodayFocusState();
      if (cancelled) return;
      setState(next);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
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
  const mainTask = state.mainTask || recommendation?.mainBlock || null;
  const sideTask = state.sideTask || recommendation?.sideBlock || null;
  const cutTasks = state.cutTasks?.length ? state.cutTasks : recommendation?.cut || [];
  const isSunday = dailyLog.day_type === DAY_TYPES.SUNDAY;
  
  const mode = dailyLog.mode || 'plan';

  async function handleDailyLogUpdate(updates) {
    const nextCapacityMode = calculateCapacityMode({
      dayType:       updates.day_type        || dailyLog.day_type,
      energy:        updates.energy_am       ?? dailyLog.energy_am,
      guilt:         updates.guilt_am        ?? dailyLog.guilt_am,
      mainBlockDone: updates.main_block_done ?? dailyLog.main_block_done,
      shutdownDone:  updates.shutdown_done   ?? dailyLog.shutdown_done,
      override:      updates.status_override ?? dailyLog.status_override,
    });
    await updateDailyLog(dailyLog.id, { ...updates, capacity_mode: nextCapacityMode });
    await refresh();
  }

  async function commitToday() {
    await handleDailyLogUpdate({
      mode: 'execute',
      main_block_task_id: dailyLog.main_block_task_id || mainTask?.id || null,
      side_block_task_id: dailyLog.side_block_task_id || sideTask?.id || null,
      cut_task_ids: cutTasks.map(t => t.id)
    });
  }

  function createCleanProposal() {
    setProposal({
      ...buildTaskCleanerProposal(state.tasks, { today: state.date, dayType: dailyLog.day_type, capacityMode: dailyLog.capacity_mode }),
      daily_log_id: dailyLog.id,
      date:         state.date,
    });
  }

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

  const showCloseDay = Boolean(dailyLog.main_block_done || mainTask?.done) || Boolean(dailyLog.cut_task_ids?.length > 0 && !dailyLog.main_block_task_id);

  return (
    <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <TodayCommandBar
        date={state.date}
        weekday={state.weekday}
        dailyLog={dailyLog}
      />

      {mode === 'plan' && (
        <div className="dash-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <MainBlockCard
              task={mainTask}
              tasks={activeTasks}
              selectedId={dailyLog.main_block_task_id || ""}
              onSelect={(id) => handleDailyLogUpdate({ main_block_task_id: id || null })}
              onStart={() => setTimerConfig({ task: mainTask, mode: FOCUS_MODES.MAIN })}
            />
            <SideBlockCard
              task={sideTask}
              tasks={activeTasks}
              selectedId={dailyLog.side_block_task_id || ""}
              onSelect={(id) => handleDailyLogUpdate({ side_block_task_id: id || null })}
              onStart={() => setTimerConfig({ task: sideTask, mode: FOCUS_MODES.SIDE })}
            />
            
            <button className="dash-btn-accent" style={{ padding: "1rem", fontSize: "1rem" }} onClick={commitToday}>
              Commit Today
            </button>
          </div>
          
          <div className="dash-card-right-col">
            <AIOperatorCard onCleanTasks={createCleanProposal} />
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
                    <li key={task.id} style={{ padding: "0.5rem", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.85rem" }}>
                      {task.name}
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

            {proposal && (
              <div className="dash-card">
                <FocusProposalCard proposal={proposal} tasks={state.tasks} onApplied={refresh} />
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'execute' && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <MainBlockCard
            task={mainTask}
            tasks={activeTasks}
            selectedId={dailyLog.main_block_task_id || ""}
            onSelect={(id) => handleDailyLogUpdate({ main_block_task_id: id || null })}
            onStart={() => setTimerConfig({ task: mainTask, mode: FOCUS_MODES.MAIN })}
          />
          {sideTask && (
            <SideBlockCard
              task={sideTask}
              tasks={activeTasks}
              selectedId={dailyLog.side_block_task_id || ""}
              onSelect={(id) => handleDailyLogUpdate({ side_block_task_id: id || null })}
              onStart={() => setTimerConfig({ task: sideTask, mode: FOCUS_MODES.SIDE })}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <div className="dash-card" style={{ textAlign: "center", padding: "2rem" }}>
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
    </div>
  );
}
