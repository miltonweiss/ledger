"use client";

import { useState } from "react";
import { Timer, ChevronDown, ChevronRight } from "lucide-react";

export default function SupportBlockCard({ 
  task, 
  tasks, 
  selectedId, 
  selectedPresetId = "",
  onSelect, 
  onStart,
  presets = [],
  onPresetClick,
  dayType
}) {
  const [expanded, setExpanded] = useState(true);
  const hasDefinition = Boolean(task?.definition_of_done);

  return (
    <div className="dash-card dash-card-interactive">
      <div 
        className="dash-card-header" 
        style={{ cursor: "pointer", margin: expanded ? "0 0 1rem 0" : "0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="dash-card-title">Support Block</div>
        </div>
        {!expanded && task && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{task.name}</span>
        )}
      </div>
      
      {expanded && (
        <div className="dash-collapse-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Keeps the system stable after the main progress.
          </p>

          {presets.length > 0 && (
            <div className="support-presets-section">
              <div className="dash-card-label" style={{ marginBottom: "0.5rem" }}>
                Recommended for {dayType}:
              </div>
              <select
                className="dash-select"
                style={{ width: "100%", marginBottom: "0.75rem" }}
                value={selectedPresetId}
                onChange={(e) => {
                  const preset = presets.find(p => p.id === e.target.value);
                  if (preset) onPresetClick(preset);
                }}
              >
                <option value="">Select from recommendation...</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title} ({preset.defaultDurationMinutes}m)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="support-selection-section">
            <div className="dash-card-label" style={{ marginBottom: "0.5rem" }}>
              {task ? "Change Support Block:" : "Or select existing task:"}
            </div>
            <select
              className="dash-select"
              style={{ width: "100%" }}
              value={selectedPresetId ? "" : selectedId}
              onChange={(e) => onSelect(e.target.value)}
            >
              <option value="">Select task...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {task && (
            <div className="support-task-details" style={{ marginTop: "0.5rem" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>
                {task.name}
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div className="dash-card-label" style={{ marginBottom: "0.5rem" }}>Definition of Done:</div>
                {hasDefinition ? (
                  <div className="block-task-dod" style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(task.definition_of_done);
                        return parsed.content?.map(p => p.content?.map(t => t.text).join('')).join(' ') || task.definition_of_done;
                      } catch (e) {
                        return task.definition_of_done;
                      }
                    })()}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--red-accent)" }}>
                    Needs Definition of Done to commit.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1.5rem", display: "flex", gap: "2rem" }}>
                <div>
                  <div className="dash-card-label" style={{ marginBottom: "0.2rem" }}>Duration:</div>
                  <div style={{ fontSize: "0.9rem" }}>{task?.estimated_minutes || 40} min</div>
                </div>
                <div>
                  <div className="dash-card-label" style={{ marginBottom: "0.2rem" }}>Energy:</div>
                  <div style={{ fontSize: "0.9rem" }}>{task?.energy_required || "Medium"}</div>
                </div>
              </div>

              <button className="dash-btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onStart}>
                <Timer size={16} />
                Start Focus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
