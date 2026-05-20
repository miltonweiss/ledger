import { supabase } from "./client"

export async function getTodo (){
    let { data, error } = await supabase
      .from('tasks')
      .select("*")
      .is('killed_at', null)
      .order('created_at', { ascending: false })

  if (isMissingFocusTaskColumns(error)) {
    ;({ data, error } = await supabase
      .from('tasks')
      .select("*")
      .order('created_at', { ascending: false }))
  }
  
  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
  
  return data || [];
}

export async function createTodo(todo){
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let { data, error } = await supabase
      .from('tasks')
      .insert([{
        name: todo.name,
        done: todo.done || false,
        due: todo.due || null,
        priority: todo.priority || 'Average',
        area: todo.area || null,
        work_type: todo.work_type || null,
        block_type: todo.block_type || null,
        energy_required: todo.energy_required || null,
        definition_of_done: todo.definition_of_done || null,
        estimated_minutes: todo.estimated_minutes || null,
        actual_minutes: todo.actual_minutes || 0,
        completed_at: todo.done ? new Date().toISOString() : null,
        user_id: user?.id,
      }])
      .select()

    if (isMissingFocusTaskColumns(error)) {
      const retry = await supabase
        .from('tasks')
        .insert([{
          name: todo.name,
          done: todo.done || false,
          due: todo.due || null,
          priority: todo.priority || 'Average',
          user_id: user?.id,
        }])
        .select()

      if (!retry.error) return retry.data?.[0] || null;
      error = retry.error;
    }

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

function isMissingFocusTaskColumns(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    error?.code === "42703" ||
    message.includes("killed_at") ||
    message.includes("completed_at") ||
    message.includes("area") ||
    message.includes("work_type")
  );
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
  const payload = { ...updates };
  if (Object.prototype.hasOwnProperty.call(payload, "done")) {
    payload.completed_at = payload.done ? new Date().toISOString() : null;
  }

  let { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()

  if (isMissingFocusTaskColumns(error)) {
    const fallbackPayload = { ...updates };
    ;({ data, error } = await supabase
      .from('tasks')
      .update(fallbackPayload)
      .eq('id', id)
      .select())
  }

  if (error) {
    console.error('Error updating todo:', error);
    return null;
  }

  return data?.[0] || null;
}
