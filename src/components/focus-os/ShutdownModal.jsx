"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveShutdown, updateDailyLog } from "@/lib/supabase/focus-os";
import { greenToast, redToast } from "@/components/toasts";
import { toLocalDateString } from "@/lib/focus-os/day.js";

function tomorrowString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateString(date);
}

export default function ShutdownModal({ dailyLog, onSaved }) {
  const [produced, setProduced] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextStepDate, setNextStepDate] = useState(tomorrowString());
  const [saving, setSaving] = useState(false);

  if (typeof document === "undefined") return null;

  async function handleSave() {
    if (!produced.trim() || !nextStep.trim() || !nextStepDate) {
      redToast("Shutdown incomplete", "Produced, next step, and date are required.");
      return;
    }

    setSaving(true);
    const shutdown = await saveShutdown({
      dailyLog,
      produced,
      nextStep,
      nextStepDate,
      stopPermissionGranted: true,
    });
    setSaving(false);

    if (shutdown) {
      greenToast("Day Closed", "The next step is saved. You may stop.");
      onSaved?.();
    }
  }

  return (
    <div className="dash-card">
      <div className="flex items-start justify-between gap-4" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="text-sm deemphasize">Shutdown</p>
          <h2 className="text-3xl">Close the loop</h2>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <label className="flex flex-col gap-2">
          <span className="text-sm deemphasize">What did I produce today?</span>
          <textarea
            value={produced}
            onChange={(event) => setProduced(event.target.value)}
            className="focus-textarea"
            rows={3}
            placeholder="Main outputs..."
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm deemphasize">What is the next concrete step?</span>
          <textarea
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
            className="focus-textarea"
            rows={2}
            placeholder="Next physical action..."
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm deemphasize">When will I do it?</span>
          <input
            type="date"
            value={nextStepDate}
            onChange={(event) => setNextStepDate(event.target.value)}
            className="focus-input"
          />
        </label>

        <div className="focus-modal-actions" style={{ marginTop: "1rem" }}>
          <button className="dash-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={handleSave} disabled={saving}>
            <CheckCircle2 size={16} style={{ marginRight: "8px" }} />
            Day Closed
          </button>
        </div>
      </div>
    </div>
  );
}
