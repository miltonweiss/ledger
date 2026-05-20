"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { updateTodo, deleteTodo } from "@/lib/supabase/todo";
import { Checkbox } from "@/components/checkbox";
import { DatePicker } from "@/components/datePicker";
import Select from "@/components/select";
import FocusTimerModal from "@/components/focus-os/FocusTimerModal";
import { AreaSelect, BlockTypeSelect, EnergySelect, WorkTypeSelect } from "@/components/focus-os/FocusFields";
import { FOCUS_MODES } from "@/lib/focus-os/constants.js";
import { getOrCreateDailyLog } from "@/lib/supabase/focus-os";
import { toLocalDateString } from "@/lib/focus-os/day.js";
import { X, Trash2, Loader2, Calendar as CalendarIcon, Tag, Timer, Target, Flame } from "lucide-react";

const SimpleEditor = dynamic(
  () => import("@/components/tiptap-templates/simple/simple-editor").then((mod) => mod.SimpleEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin opacity-30" size={20} />
      </div>
    ),
  },
);

export default function TodoDetailPanel({ todoId, onClose, onUpdated, onDeleted }) {
  const [todo, setTodo] = useState(null);
  const [dailyLog, setDailyLog] = useState(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchTodo() {
      if (!todoId) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', todoId)
        .single();
      
      if (error) {
        console.error("Error fetching todo:", error);
      } else {
        setTodo(data);
      }
      const log = await getOrCreateDailyLog(toLocalDateString());
      setDailyLog(log);
      setIsLoading(false);
    }
    fetchTodo();
  }, [todoId]);

  const isClosed = dailyLog?.mode === 'closed';

  const handleUpdate = async (updates) => {
    if (isClosed) {
      redToast("Day is closed", "Tasks are read-only.");
      return;
    }
    setIsSaving(true);
    const updated = await updateTodo(todoId, updates);
    if (updated) {
      setTodo(updated);
      if (onUpdated) onUpdated(updated);
    }
    setIsSaving(false);
  };

  const refreshTodo = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', todoId)
      .single();
    if (!error) {
      setTodo(data);
      if (onUpdated) onUpdated(data);
    }
  };

  const handleDelete = async () => {
    if (isClosed) {
      redToast("Day is closed", "Tasks are read-only.");
      return;
    }
    if (confirm("Are you sure you want to delete this task?")) {
      const success = await deleteTodo(todoId);
      if (success) {
        if (onDeleted) onDeleted(todoId);
        onClose();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin opacity-20" size={32} />
      </div>
    );
  }

  if (!todo) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <p className="opacity-50">Task not found</p>
        <button onClick={onClose} className="btn btn-ghost">Close</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b borderDefault">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Task Details</h3>
          {isSaving && <Loader2 size={14} className="animate-spin opacity-50" />}
        </div>
        <button onClick={onClose} className="ghost-btn p-1.5 rounded-full hoverGhostButton">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        <div className="flex items-start gap-4">
          <div className="pt-1.5">
            <Checkbox 
              check={todo.done} 
              todo={todo} 
              setTodos={(updater) => {
                const updatedList = typeof updater === 'function' ? updater([todo]) : updater;
                handleUpdate({ done: updatedList[0].done });
              }}
            />
          </div>
          <textarea 
            value={todo.name} 
            onChange={(e) => setTodo({...todo, name: e.target.value})}
            onBlur={() => handleUpdate({ name: todo.name })}
            className="text-2xl font-bold bg-transparent border-none outline-none flex-1 resize-none py-0"
            rows="2"
            placeholder="What needs to be done?"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-wider">
              <Tag size={12} />
              Priority
            </div>
            <Select 
              value={todo.priority || "Average"} 
              onChange={(val) => handleUpdate({ priority: val })} 
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-wider">
              <CalendarIcon size={12} />
              Due Date
            </div>
            <DatePicker 
              value={todo.due} 
              onChange={(date) => handleUpdate({ due: date })}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AreaSelect value={todo.area || ""} onChange={(val) => handleUpdate({ area: val })} />
          <WorkTypeSelect value={todo.work_type || ""} onChange={(val) => handleUpdate({ work_type: val })} />
          <BlockTypeSelect value={todo.block_type || ""} onChange={(val) => handleUpdate({ block_type: val })} />
          <EnergySelect value={todo.energy_required || ""} onChange={(val) => handleUpdate({ energy_required: val })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider">Est. Minutes</span>
            <input
              type="number"
              min="5"
              value={todo.estimated_minutes || ""}
              onChange={(event) => setTodo({ ...todo, estimated_minutes: event.target.value })}
              onBlur={() => handleUpdate({ estimated_minutes: todo.estimated_minutes ? Number(todo.estimated_minutes) : null })}
              className="focus-input text-sm py-2"
              placeholder="45"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider">Logged</span>
            <div className="focus-input flex items-center gap-2 text-sm py-2">
              <Flame size={14} className="text-orange-500" />
              {todo.actual_minutes || 0} min
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-wider">
            <Target size={12} />
            Definition of Done
          </div>
          <div className="borderDefault rounded-md overflow-hidden bg-surface-sunken min-h-[200px]">
            <SimpleEditor 
              initialContent={(() => {
                try {
                  return JSON.parse(todo.definition_of_done);
                } catch (e) {
                  return todo.definition_of_done ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: todo.definition_of_done }] }] } : null;
                }
              })()}
              onUpdate={(json) => handleUpdate({ definition_of_done: JSON.stringify(json) })}
            />
          </div>
        </div>

        <div className="pt-8 mt-auto border-t borderDefault flex justify-between items-center">
          <div className="text-[9px] opacity-30 uppercase">
            ID: {todo.id.split('-')[0]}...
          </div>
          <div className="flex items-center gap-2">
            {!isClosed && (
              <button onClick={() => setTimerOpen(true)} className="accent-btn py-1.5 px-3 text-xs">
                <Timer size={14} />
                Start Focus
              </button>
            )}
            {!isClosed && (
              <button onClick={handleDelete} className="btn btn-error btn-outline btn-xs h-8 px-2 opacity-50 hover:opacity-100">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {timerOpen ? (
        <FocusTimerModal
          open={true}
          task={todo}
          dailyLog={dailyLog}
          dayType={dailyLog?.day_type}
          mode={todo?.block_type || FOCUS_MODES.GREEN}
          onClose={() => setTimerOpen(false)}
          onSaved={refreshTodo}
        />
      ) : null}
    </div>
  );
}
