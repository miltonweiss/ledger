"use client";

import { DAY_TYPES, getCapacityBudgetMinutes } from "@/lib/focus-os/constants.js";
import { Shield } from "lucide-react";

function StatusBadge({ mode }) {
  return <span className="status-badge" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}>{mode}</span>;
}

export default function TodayCommandBar({
  date,
  weekday,
  dailyLog,
}) {
  const isSunday = dailyLog.day_type === DAY_TYPES.SUNDAY;
  const budgetMinutes = getCapacityBudgetMinutes(dailyLog.day_type);
  
  // Format hours and mins
  const hours = Math.floor(budgetMinutes / 60);
  const mins = budgetMinutes % 60;
  const budgetText = budgetMinutes > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}` : "0h";
  
  const heroVariant = isSunday ? "day-hero-protected" : 
    (dailyLog.capacity_mode?.toLowerCase() === "recovery" ? "day-hero-recovery" : 
     dailyLog.capacity_mode?.toLowerCase() === "stability" ? "day-hero-stability" : 
     "day-hero-growth");

  return (
    <div className={`day-hero ${heroVariant} dash-card-interactive`}>
      <div className="day-hero-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="day-hero-date">
          <span className="day-hero-eyebrow" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Today</span>
          <div className="day-hero-weekday" style={{ fontSize: "1.2rem", fontWeight: "600" }}>{weekday}</div>
          <div className="day-hero-daytype" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{dailyLog.day_type}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.6rem" }}>
          <StatusBadge mode={dailyLog.capacity_mode} />
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Available Work Capacity: <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{budgetText}</span>
          </div>
        </div>
      </div>

      {isSunday && (
        <div className="sunday-shield" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "0.75rem", borderRadius: "8px" }}>
          <Shield size={18} className="sunday-shield-icon" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.2rem" }}>Protected Sunday</div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Today counts as won if you do not work. Body, relationships, and real rest are the priority.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
