import { updateTodo } from "@/lib/supabase/todo";

export function Checkbox (props){

    async function handleChange (event){
      const newDoneState = event.target.checked;
      
      // Update in database if todo has an id
      if (props.todo.id) {
        const updatedTodo = await updateTodo(props.todo.id, { done: newDoneState });
        if (updatedTodo) {
          // Update the specific todo in the array
          props.setTodos((prevTodos) => {
            return prevTodos.map((todo) => {
              if (todo.id === props.todo.id) {
                return updatedTodo;
              }
              return todo;
            });
          });
        }
      } else {
        // Fallback for todos without id (shouldn't happen, but just in case)
        props.setTodos((prevTodos) => {
          return prevTodos.map((todo) => {
            if (todo.name === props.todo.name) {
              return { ...todo, done: newDoneState };
            }
            return todo;
          });
        });
      }
    }

    return(
        <input
        type="checkbox"
        checked={props.check || false}
        onChange={handleChange}
        className="checkbox   foreforeground   "
      />
    )
}

