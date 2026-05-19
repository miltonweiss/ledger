"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function StopPermissionModal({ open, stopPermission, onClose, onShutdown }) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined" || !stopPermission) return null;

  return createPortal(
    <div 
      className="focus-modal-backdrop" 
      role="dialog" 
      aria-modal="true"
      onClick={onClose}
    >
      <div className="focus-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Stop check
            </p>
            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{stopPermission.title}</h2>
          </div>
          <button className="dash-btn-ghost" onClick={onClose}>Close</button>
        </div>
        
        <p style={{ marginTop: "1rem", marginBottom: "1.5rem", fontSize: "1rem" }}>{stopPermission.message}</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
          {stopPermission.checks.map((check) => (
            <div key={check.label} className="stop-check-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {check.done
                ? <CheckCircle2 size={18} className="stop-check-icon-done" style={{ color: "var(--green-accent)" }} />
                : <Circle       size={18} className="stop-check-icon-pending" style={{ color: "var(--text-muted)" }} />
              }
              <span style={{ fontSize: "0.95rem" }}>{check.label}</span>
            </div>
          ))}
        </div>

        <div className="focus-modal-actions">
          {stopPermission.allowed ? (
            <button className="dash-btn-ghost" onClick={onClose}>Understood</button>
          ) : (
            <button className="dash-btn-accent" onClick={() => { onClose(); onShutdown(); }}>Start shutdown</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
