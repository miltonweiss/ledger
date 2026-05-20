"use client";
import Header from "@/components/header";
import { useState } from "react";
import ToDoList from "@/components/todolist";
import TodoDetailPanel from "@/components/todo-detail-panel";

const TODO_HEADLINES = [
  { deemphasized: "What’s on your", emphasized: "To Do?" },
  { deemphasized: "This is your", emphasized: "To Do" },
  { deemphasized: "Things to get", emphasized: "Done" },
  { deemphasized: "Plan your", emphasized: "To Do" },
  { deemphasized: "Focus on what’s", emphasized: "Next" },
  { deemphasized: "Your tasks,", emphasized: "Organized." },
  { deemphasized: "Everything you need ", emphasized: "to Do" },
  { deemphasized: "Turn plans into", emphasized: "Actions" },
  { deemphasized: "What needs to get", emphasized: "Done?" },
  { deemphasized: "Your daily", emphasized: "Tasks" }
];

export default function TodoPage() {
  const [randint] = useState(() => Math.floor(Math.random() * TODO_HEADLINES.length));
  const [selectedTodoId, setSelectedTodoId] = useState(null);

  return (
    <div className="p-[0.5rem] flex flex-col h-full min-h-[calc(100vh-3rem)] overflow-hidden">
      <Header
        demph={TODO_HEADLINES[randint].deemphasized}
        emph={TODO_HEADLINES[randint].emphasized}
      />
      <div className="flex flex-1 min-h-0 gap-4 mt-2">
        <div className={`flex-1 transition-all duration-300 ${selectedTodoId ? 'hidden md:block' : 'block'}`}>
          <ToDoList 
            selectedTodoId={selectedTodoId}
            onSelectTodo={setSelectedTodoId}
          />
        </div>
        
        {selectedTodoId && (
          <div className="w-full md:w-[450px] lg:w-[550px] foreground borderDefault rounded-box shadow-lg flex flex-col animate-in slide-in-from-right duration-300">
            <TodoDetailPanel 
              todoId={selectedTodoId} 
              onClose={() => setSelectedTodoId(null)}
              onDeleted={() => setSelectedTodoId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
