"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { AreaSelect, WorkTypeSelect, BlockTypeSelect, EnergySelect } from "./FocusFields";
import { updateTodo } from "@/lib/supabase/todo";

export default function ClarifyTaskModal({ task, onClose, onUpdated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });

  async function handleSave() {
    setIsSaving(true);
    const updated = await updateTodo(task.id, {
      area: editedTask.area,
      work_type: editedTask.work_type,
      energy_required: editedTask.energy_required,
      estimated_minutes: Number(editedTask.estimated_minutes),
      definition_of_done: editedTask.definition_of_done,
      block_type: editedTask.block_type
    });
    setIsSaving(false);
    if (updated) {
      onUpdated(updated);
      onClose();
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="focus-modal-backdrop"
      onClick={onClose}
      style={{ alignItems: "center", overflowY: "auto" }}
    >
      <div
        className="focus-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px", maxHeight: "calc(100dvh - 2rem)", margin: "auto" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Clarify Task</h2>
          <button onClick={onClose} className="ghost-btn">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="dash-card-label">Task Name</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.25rem" }}>{task.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AreaSelect 
              value={editedTask.area} 
              onChange={(val) => setEditedTask(prev => ({ ...prev, area: val }))} 
            />
            <WorkTypeSelect 
              value={editedTask.work_type} 
              onChange={(val) => setEditedTask(prev => ({ ...prev, work_type: val }))} 
            />
            <EnergySelect 
              value={editedTask.energy_required} 
              onChange={(val) => setEditedTask(prev => ({ ...prev, energy_required: val }))} 
            />
            <BlockTypeSelect 
              value={editedTask.block_type} 
              onChange={(val) => setEditedTask(prev => ({ ...prev, block_type: val }))} 
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="dash-card-label">Estimated Minutes</span>
            <input
              type="number"
              className="focus-input"
              value={editedTask.estimated_minutes || ""}
              onChange={(e) => setEditedTask(prev => ({ ...prev, estimated_minutes: e.target.value }))}
              placeholder="e.g. 45"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="dash-card-label">Definition of Done</span>
            <textarea
              className="focus-textarea"
              rows={3}
              value={editedTask.definition_of_done || ""}
              onChange={(e) => setEditedTask(prev => ({ ...prev, definition_of_done: e.target.value }))}
              placeholder="What exactly is finished?"
            />
          </label>

          <button 
            className="dash-btn-accent" 
            style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Save Clarification"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
