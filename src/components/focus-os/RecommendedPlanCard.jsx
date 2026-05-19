"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function RecommendedPlanCard({
  recommendation,
  onAccept,
  hasMainBlock
}) {
  const [expanded, setExpanded] = useState(!hasMainBlock);

  useEffect(() => {
    if (hasMainBlock) setExpanded(false);
    else setExpanded(true);
  }, [hasMainBlock]);

  return (
    <div className="dash-card">
      <div 
        className="dash-card-header" 
        style={{ cursor: "pointer", margin: expanded ? "0 0 1rem 0" : "0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="dash-card-title">Recommended Plan</div>
        </div>
        {expanded && onAccept && (
          <button className="dash-btn-accent" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
            Accept plan
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div className="dash-card-label">Green Work</div>
            <div style={{ fontSize: "0.9rem" }}>20 min</div>
          </div>
          
          <div>
            <div className="dash-card-label">Break</div>
            <div style={{ fontSize: "0.9rem" }}>45–60 minutes downtime</div>
          </div>

          <div>
            <div className="dash-card-label">Main Block</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {recommendation?.mainBlock?.name || "No main block suggested"}
            </div>
          </div>

          <div>
            <div className="dash-card-label">Side Block</div>
            <div style={{ fontSize: "0.9rem" }}>
              {recommendation?.sideBlock?.name || "Optional"}
            </div>
          </div>

          <div>
            <div className="dash-card-label">Shutdown</div>
            <div style={{ fontSize: "0.9rem" }}>5 minutes</div>
          </div>
        </div>
      )}
    </div>
  );
}
