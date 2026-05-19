"use client";

import { Timer } from "lucide-react";

export default function MainBlockCard({ task, tasks, selectedId, onSelect, onStart }) {
  const hasDefinition = Boolean(task?.definition_of_done);

  return (
    <div className="dash-card" style={{ border: task ? "1px solid var(--accent)" : undefined }}>
      <div className="dash-card-header">
        <div className="dash-card-title">Main Block</div>
      </div>
      
      <div style={{ marginTop: "1rem" }}>
        <select
          className="dash-select"
          style={{ width: "100%", marginBottom: task ? "1rem" : "0" }}
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
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {task.name}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
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
                <div style={{ fontSize: "0.9rem", color: "var(--red-accent)" }}>
                  No main block without Definition of Done.
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="dash-card-label" style={{ marginBottom: "0.2rem" }}>Duration:</div>
              <div style={{ fontSize: "0.9rem" }}>{task?.estimated_minutes || 90} minutes</div>
            </div>

            <button className="dash-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={onStart}>
              <Timer size={16} />
              Start Focus
            </button>
          </>
        )}
      </div>
    </div>
  );
}
