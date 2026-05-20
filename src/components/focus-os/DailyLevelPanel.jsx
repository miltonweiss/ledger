"use client";

import { Battery, Brain, Frown, Activity, Moon, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function LevelSlider({ label, value, onChange, icon: Icon, color, accentColor }) {
  const rangeRef = useRef(null);
  const [draftValue, setDraftValue] = useState((value ?? 0) * 10);
  const displayValue = Math.round(draftValue / 10);

  useEffect(() => {
    setDraftValue((value ?? 0) * 10);
  }, [value]);

  useEffect(() => {
    if (rangeRef.current) {
      const percentage = draftValue;
      rangeRef.current.style.setProperty("--fill", `${percentage}%`);
      rangeRef.current.style.setProperty("--slider-accent", accentColor || "var(--accent)");
    }
  }, [draftValue, accentColor]);

  function commitValue(nextDraftValue = draftValue) {
    onChange(Math.round(nextDraftValue / 10));
  }

  return (
    <div className="smooth-slider-wrap" style={{ marginBottom: "1rem" }}>
      <div className="smooth-slider-label">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Icon size={16} color={color || "var(--text-muted)"} />
          <span>{label}</span>
        </div>
        <div className="smooth-slider-value">{displayValue}/10</div>
      </div>
      <input
        ref={rangeRef}
        type="range"
        className="smooth-slider"
        min="0"
        max="100"
        step="1"
        value={draftValue}
        onChange={(e) => setDraftValue(Number(e.target.value))}
        onPointerUp={() => commitValue()}
        onKeyUp={() => commitValue()}
        onBlur={() => commitValue()}
      />
    </div>
  );
}

export default function DailyLevelPanel({ dailyLog, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  if (!dailyLog) return null;

  return (
    <div className="dash-card dash-card-interactive">
      <div 
        className="dash-card-header" 
        style={{ cursor: "pointer", margin: expanded ? "0 0 0.5rem 0" : "0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="dash-card-title">Daily Levels</div>
        </div>
        {!expanded && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Energy {dailyLog.energy_am ?? 5} · Stress {dailyLog.stress_am ?? 5}
          </span>
        )}
      </div>
      
      {expanded && (
        <div className="dash-collapse-body">
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Log your current state to get better recommendations.
          </p>

          <LevelSlider
        label="Energy"
        icon={Battery}
        value={dailyLog.energy_am ?? 5}
        onChange={(val) => onUpdate({ energy_am: val })}
        accentColor="var(--green-accent)"
      />

      <LevelSlider
        label="Mood"
        icon={Brain}
        value={dailyLog.mood_am ?? 5}
        onChange={(val) => onUpdate({ mood_am: val })}
        accentColor="var(--yellow-accent)"
      />

      <LevelSlider
        label="Stress"
        icon={Activity}
        value={dailyLog.stress_am ?? 5}
        onChange={(val) => onUpdate({ stress_am: val })}
        accentColor="var(--red-accent)"
      />

      <LevelSlider
        label="Sleep Quality"
        icon={Moon}
        value={dailyLog.sleep_quality ?? 5}
        onChange={(val) => onUpdate({ sleep_quality: val })}
        accentColor="var(--blue-accent)"
      />

      <LevelSlider
        label="Recovery"
        icon={Battery}
        value={dailyLog.recovery_level ?? 5}
        onChange={(val) => onUpdate({ recovery_level: val })}
        accentColor="var(--purple-accent)"
      />

      <LevelSlider
        label="Guilt"
        icon={Frown}
        value={dailyLog.guilt_am ?? 0}
        onChange={(val) => onUpdate({ guilt_am: val })}
        accentColor="var(--orange-accent)"
      />
        </div>
      )}
    </div>
  );
}