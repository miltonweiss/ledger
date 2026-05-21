"use client";
import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/checkbox";
import { Trash, AddPlus } from "./icons";
import { getTodo, createTodo, deleteTodo, updateTodo } from "@/lib/supabase/todo";
import { redToast } from "./toasts";
import { DatePicker } from "./datePicker";
import Select from "./select";
import Link from "next/link";
import { Timer } from "lucide-react";
import FocusTimerModal from "@/components/focus-os/FocusTimerModal";
import { FOCUS_MODES } from "@/lib/focus-os/constants.js";
import { getOrCreateDailyLog } from "@/lib/supabase/focus-os";
export default function ToDoList ({ selectedTodoId, onSelectTodo }){
    const [newTodo, setTodo] = useState("")
    const [dueDate, setDueDate] = useState(null)
    const [priority, setPriority] = useState("Average")
    const [todos, setTodos] = useState([])
    const [dailyLog, setDailyLog] = useState(null)
    const [timerTask, setTimerTask] = useState(null)
    const [filter, setFilter] = useState("Active") // "All", "Active", "Completed"
    const [editingId, setEditingId] = useState(null)
    const [editingName, setEditingName] = useState("")

    useEffect( () => {
        async function fetchTodos() {
            const [data, log] = await Promise.all([getTodo(), getOrCreateDailyLog()]);
            setTodos(data);
            setDailyLog(log);
        }
        fetchTodos();
    }, [])

    const filteredAndSortedTodos = useMemo(() => {
        let result = [...todos];
        
        // Filtering
        if (filter === "Active") {
            result = result.filter(t => !t.done);
        } else if (filter === "Completed") {
            result = result.filter(t => t.done);
        }

        // Sorting: Uncompleted first, then by created_at (desc)
        return result.sort((a, b) => {
            if (a.done !== b.done) {
                return a.done ? 1 : -1;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [todos, filter]);

      async function refreshTodos (){
        const data = await getTodo();
        setTodos(data);
      }


      async function handleSave (){
        if (newTodo.trim() === "") return; // Verhindert leere Todos
        
        const newTodoObj = {
          name: newTodo,
          done: false,
          due: dueDate || null,
          priority: priority
        };
        
        const createdTodo = await createTodo(newTodoObj);
        
        if (createdTodo) {
          setTodos([...todos, createdTodo]);
          setTodo(""); 
          setDueDate(null);
          setPriority("Average");
        } else {
          redToast("Error", "Failed to create todo. Check console for details.");
        }
      }

      async function handleDelete(todoToDelete){
        if (!todoToDelete.id) {
          setTodos(todos.filter(todo => todo.name !== todoToDelete.name));
          redToast("Deleted", "One more gone!")
          return;
        }
        
        const success = await deleteTodo(todoToDelete.id);
        
        if (success) {
          setTodos(todos.filter(todo => todo.id !== todoToDelete.id));
          if (selectedTodoId === todoToDelete.id) {
            onSelectTodo(null);
          }
          redToast("Deleted", "One more gone!")
        }
      }

      async function handleInlineUpdate(id, newName) {
        if (!newName.trim() || newName === todos.find(t => t.id === id)?.name) {
          setEditingId(null);
          return;
        }
        const updated = await updateTodo(id, { name: newName });
        if (updated) {
          setTodos(todos.map(t => t.id === id ? updated : t));
        }
        setEditingId(null);
      }


    const isClosed = dailyLog?.mode === 'closed';

    return(
        <ul className="list foreground rounded-box shadow-md w-full flex-1 min-h-0 borderDefault p-4 gap-3 flex flex-col overflow-hidden todo-list-panel">
            
        <div className="flex mb-2 items-center justify-between"> 
            <li className="text-[0.68rem] opacity-60 tracking-wide font-bold uppercase">To Do List</li>
            <div className="flex gap-1 bg-[var(--surface-sunken)] p-1 rounded-lg borderDefault">
              {["Active", "Completed", "All"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 !text-[0.7rem] font-bold uppercase tracking-[0.08em] rounded-md transition-all border ${
                    filter === f 
                      ? "bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-default)] shadow-sm" 
                      : "opacity-40 hover:opacity-100 border-transparent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
        </div>

        {isClosed ? (
          <div className="dash-card" style={{ textAlign: "center", padding: "1rem", backgroundColor: "var(--bg-secondary)" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500", textTransform: "uppercase" }}>Day is Closed</span>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>Task list is locked until you start a new day.</p>
          </div>
        ) : (
          <div className="todo-add-form mb-4 borderDefault foreforeground rounded-xl p-3 flex flex-col gap-3">
            <textarea
              className="w-full bg-transparent text-[0.82rem] leading-snug resize-none outline-none border-none p-1 placeholder:opacity-50 rounded-md"
              placeholder="What needs to get done?"
              rows={1}
              value={newTodo}
              onChange={(e) => setTodo(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSave();
                  }
              }}
            />
            <div className="flex items-center justify-between border-t borderDefault pt-3 mt-1 border-opacity-50">
              <div className="flex items-center gap-2">
                <Select value={priority} onChange={setPriority} />
                <DatePicker 
                  value={dueDate} 
                  onChange={setDueDate}
                  className="w-auto"
                />
              </div>
              <button className="accent-btn todo-add-btn flex items-center gap-1 px-3 py-1.5 text-[0.72rem]" onClick={handleSave}>
                <AddPlus /> Add
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {filteredAndSortedTodos.length === 0 ? (
            <div className="todo-empty-state py-12">
              <div className="todo-empty-icon">✓</div>
              <h4>You are clear</h4>
              <p>Add something above when you are ready.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredAndSortedTodos.map((todo) => (
                <li 
                  key={todo.id || todo.name} 
                  className={`todo-item-enter todo-list-item group rounded-xl borderDefault transition-all duration-200 ${
                    selectedTodoId === todo.id ? 'todo-list-item-selected border-transparent' : 'foreforeground'
                  }`}
                >
                  <div className="flex px-3 py-2.5 items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div style={{ opacity: isClosed ? 0.5 : 1, pointerEvents: isClosed ? 'none' : 'auto' }}>
                        <Checkbox
                          check={todo.done}
                          setTodos={setTodos}
                          todo={todo}
                        />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        {editingId === todo.id ? (
                          <input
                            autoFocus
                            className="bg-transparent border-none outline-none font-medium w-full text-[0.82rem]"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleInlineUpdate(todo.id, editingName)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleInlineUpdate(todo.id, editingName);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                        ) : (
                          <div 
                            onClick={() => { if (!isClosed) onSelectTodo(todo.id); }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (!isClosed) {
                                setEditingId(todo.id);
                                setEditingName(todo.name);
                              }
                            }}
                            className={`text-[0.82rem] leading-snug font-medium truncate ${!isClosed ? 'cursor-pointer hover:opacity-80 ' : ''} transition-colors ${todo.done ? "line-through opacity-40" : ""}`}
                          >
                            {todo.name}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-1.5">
                          {todo.priority && todo.priority !== "Average" && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              todo.priority === "High" ? "border-red-500/30 text-red-500 bg-red-500/5" : "border-blue-500/30 text-blue-500 bg-blue-500/5"
                            }`}>
                              {todo.priority}
                            </span>
                          )}
                          {todo.area && <span className="focus-pill !text-[9px] !px-1.5 !py-0.5">{todo.area}</span>}
                          {todo.due && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              new Date(todo.due) < new Date() && !todo.done ? "border-red-500/30 text-red-500 bg-red-500/5" : "borderDefault opacity-50"
                            }`}>
                              {new Date(todo.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isClosed && (
                      <div className="todo-row-actions flex items-center gap-1">
                        <button 
                          onClick={() => setTimerTask(todo)} 
                          className="ghost-btn todo-icon-button hoverGhostButton" 
                          aria-label={`Start focus for ${todo.name}`}
                        >
                          <Timer size={14}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(todo)} 
                          className="ghost-btn todo-icon-button hoverGhostButton text-error/60 hover:text-error"
                        > 
                          <Trash size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </div>
          )}
        </div>

        {timerTask ? (
          <FocusTimerModal
            open={true}
            task={timerTask}
            dailyLog={dailyLog}
            dayType={dailyLog?.day_type}
            mode={timerTask.block_type || FOCUS_MODES.GREEN}
            onClose={() => setTimerTask(null)}
            onSaved={refreshTodos}
          />
        ) : null}
        
</ul>
    )
}
