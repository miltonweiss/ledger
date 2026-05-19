"use client";

import { CheckCircle2, Circle } from "lucide-react";

export default function EnoughCard({
  dailyLog,
  mainTask,
  sideTask,
  stopPermission
}) {
  const todayEnough = [
    { label: "Hauptblock erledigt", done: Boolean(dailyLog.main_block_done || mainTask?.done) },
    { label: "Nebenblock oder bewusst cut", done: Boolean(dailyLog.side_block_done || sideTask?.done || dailyLog.cut_task_ids?.length) },
    { label: "Shutdown gemacht", done: Boolean(dailyLog.shutdown_done) },
  ];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title">Heute ist genug, wenn...</div>
      </div>
      <div className="enough-list" style={{ marginTop: "0.5rem" }}>
        {todayEnough.map((item) => (
          <div key={item.label} className={`enough-item ${item.done ? "enough-item-done" : ""}`} style={{ padding: "0.4rem 0" }}>
            {item.done
              ? <CheckCircle2 size={16} className="enough-item-icon-done" />
              : <Circle       size={16} className="enough-item-icon-pending" />
            }
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-default)" }}>
        <div className="dash-card-label" style={{ marginBottom: "0.5rem" }}>Stop Permission:</div>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>
          {stopPermission?.allowed ? "Du darfst aufhören." : "Nach Hauptblock + Shutdown."}
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {stopPermission?.message}
        </p>
      </div>
    </div>
  );
}
