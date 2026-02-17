import { supabase } from "./client"

export async function getTodo (){
    const { data, error } = await supabase
  .from('tasks')
  .select("*")
  
  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
  
  console.log(data);
  return data || [];
}

export async function createTodo(todo){
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        name: todo.name,
        done: todo.done || false,
        due: todo.due || null
      }])
      .select()

    if (error) {
      console.error('Error creating todo:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details object:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Exception creating todo:', err);
    return null;
  }
}

export async function deleteTodo(id){
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting todo:', error);
    return false;
  }

  return true;
}


export async function updateTodo(id, updates){
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating todo:', error);
    return null;
  }

  return data?.[0] || null;
}

