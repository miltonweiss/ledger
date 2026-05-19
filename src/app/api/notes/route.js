import { getNotes, createNote } from "@/lib/supabase/notes";

export async function GET() {
  try {
    const notes = await getNotes();
    return Response.json(notes);
  } catch (error) {
    console.error("API Error fetching notes:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const note = await createNote(body);
    if (!note) {
      return Response.json({ error: "Failed to create note" }, { status: 500 });
    }
    return Response.json(note);
  } catch (error) {
    console.error("API Error creating note:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
