import { supabase } from "./client";

export async function getNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    throw error;
  }
  return data || [];
}

export async function getNote(id) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching note:", error);
    throw error;
  }
  return data;
}

export async function createNote(note = {}) {
  const { data, error } = await supabase
    .from("notes")
    .insert([
      {
        title: note.title || "Untitled",
        content: note.content || {},
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    throw error;
  }
  return data;
}

export async function updateNote(id, updates) {
  const { data, error } = await supabase
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", error);
    throw error;
  }
  return data;
}

export async function deleteNote(id) {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
  return true;
}
