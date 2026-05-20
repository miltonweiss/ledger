import { getNote, updateNote, deleteNote } from "@/lib/supabase/notes";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const note = await getNote(id);
    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }
    return Response.json(note);
  } catch (error) {
    console.error("API Error fetching note:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const note = await updateNote(id, body);
    if (!note) {
      return Response.json({ error: "Failed to update note" }, { status: 500 });
    }
    return Response.json(note);
  } catch (error) {
    console.error("API Error updating note:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const success = await deleteNote(id);
    if (!success) {
      return Response.json({ error: "Failed to delete note" }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("API Error deleting note:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
