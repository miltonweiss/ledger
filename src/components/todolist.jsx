"use client";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/checkbox";
import { Info, Trash, AddPlus } from "./icons";
import { getTodo, createTodo, deleteTodo } from "@/lib/supabase/todo";
import { redToast } from "./toasts";
import { DatePicker } from "./datePicker";
import Select from "./select";
export default function ToDoList (props){

    useEffect( () => {
        async function fetchTodos() {
            const data = await getTodo();
            setTodos(data);
        }
        fetchTodos();
    }, [])

    const [newTodo, setTodo] = useState("")
    const [dueDate, setDueDate] = useState(null)
    const [todos, setTodos] = useState([])


      async function handleSave (){
        if (newTodo.trim() === "") return; // Verhindert leere Todos
        
        const newTodoObj = {
          name: newTodo,
          done: false,
          due: dueDate || null
        };
        
        const createdTodo = await createTodo(newTodoObj);
        
        if (createdTodo) {
          setTodos([...todos, createdTodo]);
          setTodo(""); 
          setDueDate(null);
        } else {
          redToast("Error", "Failed to create todo. Check console for details.");
        }
      }

      async function handleDelete(todoToDelete){
        if (!todoToDelete.id) {
          // Fallback for todos without id (shouldn't happen, but just in case)
          setTodos(todos.filter(todo => todo.name !== todoToDelete.name));
          redToast("Deleted", "One more gone!")
          return;
        }
        
        const success = await deleteTodo(todoToDelete.id);
        
        if (success) {
          setTodos(todos.filter(todo => todo.id !== todoToDelete.id));
          redToast("Deleted", "One more gone!")
        }
      }


    return(
        <ul className="list foreground rounded-box shadow-md width-full flex-1 min-h-0 borderDefault p-4 gap-3 flex flex-col">
            
        <div className="flex  mb-2 items-center justify-between"> 
            <li className=" text-xs opacity-60 tracking-wide">Keep it going</li>
            

        </div>
       
                <div className="flex flex-col w-full gap-2">
                 <div className="flex w-full foreforeground borderDefault items-center gap-2">
                 <textarea 
                    rows="1" 
                    value={newTodo} 
                    onChange={(e) => setTodo(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSave();
                        }
                    }}
                    className="flex-1 text-base resize-none borderDefault py-4 px-2 "
                    placeholder="Add a new todo..."
                 ></textarea>
                 <Select/>
                 <DatePicker 
                   value={dueDate} 
                   onChange={setDueDate}
                   className="w-auto"
                 />
                 <button onClick={handleSave} className="w-[3%]  p-0"><AddPlus/></button>
                 </div>
                 </div>
                 
             

        {todos.map( (todo) => {
           
                return(
                    <li key={todo.id || todo.name} className=" mb-2">
                        <div className="flex borderDefault foreforeground px-4 py-4 items-center justify-between">
                            <div className="flex  gap-5">
                                <Checkbox
                                check={todo.done}
                                setTodos={setTodos}
                                todo={todo}
                                />
                                <p className={` ${todo.done ? "line-through deemphesize" : ""}`}>{todo.name}</p>
                            </div>
                            {todo.due && (
                              <span className="badge foreground ml-auto mr-2 opacity-70 p-4"> 
                                due {new Date(todo.due).toLocaleDateString()}
                              </span>
                            )}
                            <div>
                           
                                      <button onClick={() => handleDelete(todo)} className=" bg-none text-m "> <Trash/></button>
                                    
                                
                            </div>
                        </div>
                        
                    </li>
                )
            
            return null;
        })}
        
</ul>
    )
}
