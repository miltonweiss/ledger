"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function NotTodayList({ cutTasks }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="dash-card">
      <div 
        className="dash-card-header" 
        style={{ cursor: "pointer", margin: expanded ? "0 0 1rem 0" : "0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="dash-card-title">Not today</div>
        </div>
        {!expanded && cutTasks?.length > 0 && (
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{cutTasks.length} tasks</span>
        )}
      </div>
      
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cutTasks?.length ? (
            cutTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="cut-item" style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                - {task.name}
              </div>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Nothing cut yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
