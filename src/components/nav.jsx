"use client";

import { Dashboard, Habits, ToDo, Notes, Bubble, Bookmark, Chatbubble, Commit, PlanBack, Settings } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DAY_TYPES, CAPACITY_BUDGET } from "@/lib/focus-os/constants.js";
import { getTodayFocusState, updateDailyLog } from "@/lib/supabase/focus-os";
import { validateDefinitionOfDone } from "@/lib/focus-os/validation.js";
import { buildSupportPresetTask, getSupportPresetById } from "@/lib/focus-os/support-block-presets.js";
const FOCUS_SYNC_EVENT = "focus-os-daily-log-updated";

const iconMap = {
  dashboard: Dashboard,
  todo: ToDo,
  habits: Habits,
  notes: Notes,
  bubble: Bubble,
  bookmark: Bookmark,
  chatbubble: Chatbubble,
};

export default function NavBar() {
  const pathname = usePathname();
  const [focusState, setFocusState] = useState(null);
  const [focusSaving, setFocusSaving] = useState(false);

  async function refreshFocusState() {
    if (pathname !== "/") {
      setFocusState(null);
      return null;
    }

    const next = await getTodayFocusState();
    setFocusState(next);
    return next;
  }

  function broadcastFocusState(next) {
    window.dispatchEvent(new CustomEvent(FOCUS_SYNC_EVENT, { detail: { state: next } }));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (pathname !== "/") {
        setFocusState(null);
        return;
      }

      const next = await getTodayFocusState();
      if (!cancelled) setFocusState(next);
    }

    function handleFocusSync(event) {
      if (event.detail?.state) {
        setFocusState(event.detail.state);
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
  }, [pathname]);

  const links = [
    { href: "/", name: "Dashboard", icon: "dashboard" },
    { href: "/todo", name: "To Do's", icon: "todo" },
    { href: "/chat", name: "AI-Chat", icon: "chatbubble" },
    { href: "/notes", name: "Notes", icon: "notes" },
  ];

  const dailyLog = focusState?.dailyLog;
  const mode = dailyLog?.mode || "plan";
  const activeTasks = (focusState?.tasks || []).filter((task) => !task.done && !task.killed_at);
  const selectedMainTask = activeTasks.find((task) => task.id === dailyLog?.main_block_task_id) || null;
  const selectedSupportTask = activeTasks.find((task) => task.id === dailyLog?.side_block_task_id) || null;
  const selectedSupportPresetTask = buildSupportPresetTask(getSupportPresetById(dailyLog?.support_preset_id));
  const recommendedMainTask = dailyLog?.skip_main_block || focusState?.recommendation?.mainBlock?.id === dailyLog?.side_block_task_id
    ? null
    : focusState?.recommendation?.mainBlock || null;
  const mainTask = dailyLog?.skip_main_block ? null : selectedMainTask || recommendedMainTask;
  const sideTask = selectedSupportTask || selectedSupportPresetTask || focusState?.recommendation?.sideBlock || null;
  const cutTasks = focusState?.cutTasks?.length ? focusState.cutTasks : focusState?.recommendation?.cut || [];
  const showFocusAction = pathname === "/" && dailyLog && dailyLog.day_type !== DAY_TYPES.SUNDAY && (mode === "plan" || mode === "execute");
  const focusActionIsCommit = mode === "plan";
  const FocusActionIcon = focusActionIsCommit ? Commit : PlanBack;

  const commitValidation = (() => {
    if (!focusActionIsCommit || !mainTask) return { valid: true };
    const mainDoD = validateDefinitionOfDone(mainTask?.definition_of_done);
    const sideDoD = sideTask ? validateDefinitionOfDone(sideTask.definition_of_done) : { valid: true };
    
    const budget = CAPACITY_BUDGET[dailyLog?.day_type] || { total: 0 };
    const totalPlanned = (mainTask?.estimated_minutes || 0) + (sideTask?.estimated_minutes || 0);
    const overCapacity = totalPlanned > budget.total;

    return {
      valid: mainDoD.valid && sideDoD.valid && !overCapacity
    };
  })();

  async function handleFocusAction() {
    if (!dailyLog || focusSaving) return;
    if (focusActionIsCommit && !commitValidation.valid) return;

    setFocusSaving(true);

    try {
      const updates = focusActionIsCommit
        ? {
            mode: "execute",
            main_block_task_id: dailyLog.main_block_task_id || mainTask?.id || null,
            side_block_task_id: sideTask?.isPreset ? null : dailyLog.side_block_task_id || sideTask?.id || null,
            support_preset_id: sideTask?.isPreset ? sideTask.preset_id : dailyLog.support_preset_id || null,
            cut_task_ids: cutTasks.map((task) => task.id),
          }
        : { mode: "plan" };

      await updateDailyLog(dailyLog.id, updates);
      const next = await refreshFocusState();
      if (next) broadcastFocusState(next);
    } finally {
      setFocusSaving(false);
    }
  }

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-950/80 backdrop-blur-md border border-neutral-800 rounded-2xl px-3 py-2 flex items-center gap-1 z-50 shadow-2xl"
    >
      <div className="flex items-center gap-1">
        {links.map((link) => {
          const IconComponent = iconMap[link.icon];
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "dock-item flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "dock-item-active"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50",
              ].join(" ")}
            >
              <IconComponent size={20} />
              <span className="text-[10px] font-medium mt-1">
                {link.name}
              </span>
            </Link>
          );
        })}

        {showFocusAction && (
          <button
            type="button"
            className={[
              "dock-item dock-focus-action flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200",
              focusActionIsCommit ? "dock-focus-action-accent" : "dock-focus-action-neutral",
            ].join(" ")}
            onClick={handleFocusAction}
            disabled={focusSaving || (focusActionIsCommit && !commitValidation.valid)}
            style={{
              opacity: (focusActionIsCommit && !commitValidation.valid) ? 0.5 : undefined,
              cursor: (focusActionIsCommit && !commitValidation.valid) ? "not-allowed" : undefined
            }}
          >
            <FocusActionIcon />
            <span className="text-[10px] font-medium mt-1">
              {focusActionIsCommit ? "Commit" : "Plan"}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <div className="w-px h-8 bg-neutral-800 mx-2" />

        <Link
          href="/settings"
          className={[
            "dock-item flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200",
            pathname === "/settings"
              ? "dock-item-active"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/50",
          ].join(" ")}
        >
          <Settings />
          <span className="text-[10px] font-medium mt-1">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
