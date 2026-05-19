"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { saveWeeklyReview } from "@/lib/supabase/focus-os";
import { greenToast, redToast } from "@/components/toasts";
import { getWeekRange } from "@/lib/focus-os/score.js";

export default function WeeklyReviewModal({ onClose }) {
  const [overrunDays, setOverrunDays] = useState("");
  const [deferredTasks, setDeferredTasks] = useState("");
  const [fakeProductivity, setFakeProductivity] = useState("");
  const [bestOutput, setBestOutput] = useState("");
  const [oneProcessFix, setOneProcessFix] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!oneProcessFix.trim()) {
      redToast("Missing Fix", "You must define one process fix for next week.");
      return;
    }

    setSaving(true);
    const { start } = getWeekRange(new Date());

    const result = await saveWeeklyReview({
      week_start: start.toISOString().split("T")[0],
      overrun_days: overrunDays.split(",").map(s => s.trim()).filter(Boolean),
      deferred_tasks: deferredTasks.split(",").map(s => s.trim()).filter(Boolean),
      fake_productivity_notes: fakeProductivity,
      best_output: bestOutput,
      one_process_fix: oneProcessFix,
    });

    setSaving(false);

    if (result) {
      greenToast("Review Complete", "One process fix committed.");
      onClose();
    } else {
      redToast("Error", "Could not save review.");
    }
  }

  return (
    <div className="focus-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="focus-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm deemphasize">Weekly Review</p>
            <h2 className="text-3xl">Optimize Operations</h2>
          </div>
          <button className="ghost-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", maxHeight: "60vh", overflowY: "auto", paddingRight: "0.5rem" }}>
          <label className="flex flex-col gap-2">
            <span className="text-sm deemphasize">Which days were overrun? (Comma separated)</span>
            <input type="text" value={overrunDays} onChange={e => setOverrunDays(e.target.value)} className="focus-input" placeholder="e.g. Monday, Wednesday" />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm deemphasize">Which tasks were deferred 3+ times?</span>
            <textarea value={deferredTasks} onChange={e => setDeferredTasks(e.target.value)} className="focus-textarea" rows={2} placeholder="Tasks avoiding execution..." />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm deemphasize">Where was Fake Productivity hiding?</span>
            <textarea value={fakeProductivity} onChange={e => setFakeProductivity(e.target.value)} className="focus-textarea" rows={2} placeholder="System tweaking, admin loops..." />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm deemphasize">What was the single most valuable output?</span>
            <textarea value={bestOutput} onChange={e => setBestOutput(e.target.value)} className="focus-textarea" rows={2} placeholder="The real needle mover..." />
          </label>

          <label className="flex flex-col gap-2" style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--accent)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>ONE Process Fix for Next Week</span>
            <span className="text-xs deemphasize">Do not change 9 things. Fix one constraint.</span>
            <textarea value={oneProcessFix} onChange={e => setOneProcessFix(e.target.value)} className="focus-textarea" rows={2} placeholder="e.g. Block the first 90 minutes exclusively for Cash Work" />
          </label>
        </div>

        <div className="focus-modal-actions" style={{ marginTop: "1.5rem" }}>
          <button className="accent-btn" onClick={handleSave} disabled={saving}>
            <CheckCircle2 size={16} />
            Commit Fix
          </button>
        </div>
      </div>
    </div>
  );
}
