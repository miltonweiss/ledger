"use client";

import Link from "next/link";

export default function AIOperatorCard({
  onCleanTasks,
}) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title">AI Operator</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
        <button className="dash-btn-ghost" style={{ justifyContent: "flex-start" }} onClick={onCleanTasks}>
          Shrink Today
        </button>
        <Link href="/chat?q=Clarify Task" className="dash-btn-ghost" style={{ justifyContent: "flex-start", textDecoration: "none" }}>
          Clarify Task
        </Link>
        <Link href="/chat?q=Find Fake Productivity" className="dash-btn-ghost" style={{ justifyContent: "flex-start", textDecoration: "none" }}>
          Find Fake Productivity
        </Link>
        <Link href="/chat?q=Shutdown Coach" className="dash-btn-ghost" style={{ justifyContent: "flex-start", textDecoration: "none" }}>
          Shutdown Coach
        </Link>
      </div>
    </div>
  );
}
