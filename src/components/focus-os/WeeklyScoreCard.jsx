"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";

function CompactMetric({ label, value, status }) {
  const colorMap = {
    ok: "var(--green-accent)",
    warn: "var(--yellow-accent)",
    danger: "var(--red-accent)",
    neutral: "var(--text-main)",
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border-color)" }}>
      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: colorMap[status] || colorMap.neutral, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function WeeklyScoreCard({ weeklyScore }) {
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!weeklyScore) return null;

  const wsoStatus = weeklyScore.wsoHours >= weeklyScore.wsoTarget ? "ok" : weeklyScore.wsoHours < (weeklyScore.wsoTarget / 2) ? "warn" : "neutral";
  const cashStatus = weeklyScore.cashSessions >= weeklyScore.cashTarget ? "ok" : weeklyScore.cashSessions < (weeklyScore.cashTarget / 2) ? "warn" : "neutral";
  const schoolStatus = weeklyScore.schoolHours >= weeklyScore.schoolTarget ? "ok" : "warn";
  const gymStatus = weeklyScore.gymSessions >= weeklyScore.gymTarget ? "ok" : "neutral";
  const sundayStatus = weeklyScore.sundayProtected === null ? "neutral" : weeklyScore.sundayProtected ? "ok" : "danger";
  
  const freelanceExcess = weeklyScore.freelanceHours > weeklyScore.freelanceMax;

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ marginBottom: "1rem" }}>
        <div className="dash-card-title">Weekly Contract</div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column" }}>
        <CompactMetric 
          label="WSO Deep Work" 
          value={`${weeklyScore.wsoHours} / ${weeklyScore.wsoTarget}h`} 
          status={wsoStatus} 
        />
        <CompactMetric 
          label="Cash Work" 
          value={`${weeklyScore.cashSessions} / ${weeklyScore.cashTarget} Sessions`} 
          status={cashStatus} 
        />
        <CompactMetric 
          label="School Minimum" 
          value={weeklyScore.schoolHours >= weeklyScore.schoolTarget ? "fulfilled" : "risk"} 
          status={schoolStatus} 
        />
        <CompactMetric 
          label="Gym" 
          value={`${weeklyScore.gymSessions} / ${weeklyScore.gymTarget}`} 
          status={gymStatus} 
        />
        <CompactMetric 
          label="Sunday Protected" 
          value={weeklyScore.sundayProtected === null ? "pending" : weeklyScore.sundayProtected ? "yes" : "no"} 
          status={sundayStatus} 
        />
      </div>

      {freelanceExcess && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "var(--yellow-accent)", color: "black", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertTriangle size={16} />
          Freelance: {weeklyScore.freelanceHours}h (Limit: {weeklyScore.freelanceMax}h)
        </div>
      )}

      <button className="dash-btn-ghost" style={{ marginTop: "1.5rem", width: "100%", justifyContent: "center" }} onClick={() => setReviewOpen(true)}>
        <ClipboardCheck size={16} style={{ marginRight: "0.5rem" }} />
        Weekly Review
      </button>

      {reviewOpen && (
        <WeeklyReviewModal onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}
