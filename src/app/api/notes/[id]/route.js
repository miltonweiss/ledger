import { getNote, updateNote, deleteNote } from "@/lib/supabase/notes";

export async function GET(req, { params }) {
  try {
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
