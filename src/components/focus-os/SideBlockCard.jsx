"use client";

import { useState } from "react";
import { Timer, ChevronDown, ChevronRight } from "lucide-react";

export default function SideBlockCard({ task, tasks, selectedId, onSelect, onStart }) {
  const [expanded, setExpanded] = useState(Boolean(task));

  return (
    <div className="dash-card">
      <div 
        className="dash-card-header" 
        style={{ cursor: "pointer", margin: expanded ? "0 0 1rem 0" : "0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="dash-card-title">Side Block</div>
        </div>
        {!expanded && task && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{task.name}</span>
        )}
      </div>
      
      {expanded && (
        <div>
          <select
            className="dash-select"
            style={{ width: "100%", marginBottom: task ? "1.5rem" : "0" }}
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">Select from recommendation...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {task && (
            <>
              <div style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "1rem" }}>
                {task.name}
              </div>
              <button className="dash-btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onStart}>
                <Timer size={16} />
                Start Focus
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
