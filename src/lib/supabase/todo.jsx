import { supabase } from "./client"

export function isNotionTodoId(id) {
  return typeof id === "string" && id.startsWith("notion:");
}

export async function getTodo (){
  const [supabaseTodos, notionTodos] = await Promise.all([
    getSupabaseTodos(),
    getNotionTodos(),
  ]);

  return mergeTodos(supabaseTodos, notionTodos);
}

export async function getTodoById(id) {
  if (isNotionTodoId(id)) {
    return getNotionTodoById(id);
  }

  let { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching todo:", error);
    return null;
  }

  return normalizeSupabaseTodo(data);
}

async function getSupabaseTodos() {
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
  
  return (data || []).map(normalizeSupabaseTodo);
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

      if (!retry.error) {
        data = retry.data;
        error = null;
      } else {
        error = retry.error;
      }
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

    const createdTodo = data?.[0] || null;
    const notionTodo = await createNotionTodo(todo);

    if (createdTodo && notionTodo?.notion_page_id) {
      const linkedTodo = await linkSupabaseTodoToNotion(createdTodo.id, notionTodo.notion_page_id);
      return normalizeSupabaseTodo(linkedTodo || { ...createdTodo, notion_page_id: notionTodo.notion_page_id });
    }

    return normalizeSupabaseTodo(createdTodo) || notionTodo;
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
    message.includes("work_type") ||
    message.includes("notion_page_id")
  );
}

export async function deleteTodo(id){
  if (isNotionTodoId(id)) {
    return deleteNotionTodo(id);
  }

  const existing = await getTodoById(id);
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting todo:', error);
    return false;
  }

  if (existing?.notion_page_id) {
    await deleteNotionTodo(`notion:${existing.notion_page_id}`);
  }

  return true;
}


export async function updateTodo(id, updates){
  if (isNotionTodoId(id)) {
    return updateNotionTodo(id, updates);
  }

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

  const updatedTodo = normalizeSupabaseTodo(data?.[0] || null);

  if (updatedTodo?.notion_page_id) {
    await updateNotionTodo(`notion:${updatedTodo.notion_page_id}`, updates);
  }

  return updatedTodo;
}

async function linkSupabaseTodoToNotion(id, notionPageId) {
  let { data, error } = await supabase
    .from('tasks')
    .update({ notion_page_id: notionPageId })
    .eq('id', id)
    .select()

  if (isMissingFocusTaskColumns(error)) {
    return null;
  }

  if (error) {
    console.error('Error linking todo to Notion:', error);
    return null;
  }

  return data?.[0] || null;
}

function normalizeSupabaseTodo(todo) {
  return todo ? { ...todo, source: "supabase" } : null;
}

function mergeTodos(supabaseTodos, notionTodos) {
  const linkedNotionIds = new Set(
    supabaseTodos
      .map((todo) => normalizeNotionPageId(todo.notion_page_id))
      .filter(Boolean),
  );
  const supabaseSignatures = new Set(supabaseTodos.map(todoSignature));

  const externalNotionTodos = notionTodos.filter((todo) => {
    if (linkedNotionIds.has(normalizeNotionPageId(todo.notion_page_id))) return false;
    return !supabaseSignatures.has(todoSignature(todo));
  });

  return [...supabaseTodos, ...externalNotionTodos];
}

function todoSignature(todo) {
  return [
    String(todo?.name || "").trim().toLowerCase(),
    todo?.due || "",
    todo?.priority || "",
  ].join("|");
}

function normalizeNotionPageId(id) {
  return String(id || "").replace(/^notion:/, "").replace(/-/g, "");
}

async function getNotionTodos() {
  try {
    const response = await fetch("/api/notion/tasks");
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    console.error("Error fetching Notion todos:", error);
    return [];
  }
}

async function getNotionTodoById(id) {
  try {
    const response = await fetch(`/api/notion/tasks?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    return payload.data || null;
  } catch (error) {
    console.error("Error fetching Notion todo:", error);
    return null;
  }
}

async function createNotionTodo(todo) {
  try {
    const response = await fetch("/api/notion/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    return payload.data || null;
  } catch (error) {
    console.error("Error creating Notion todo:", error);
    return null;
  }
}

async function updateNotionTodo(id, updates) {
  try {
    const response = await fetch("/api/notion/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    return payload.data || null;
  } catch (error) {
    console.error("Error updating Notion todo:", error);
    return null;
  }
}

async function deleteNotionTodo(id) {
  try {
    const response = await fetch("/api/notion/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error(await response.text());
    return true;
  } catch (error) {
    console.error("Error deleting Notion todo:", error);
    return false;
  }
}
