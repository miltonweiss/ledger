import { createSupabaseServer } from "@/lib/supabase/server";
import {
  archiveNotionTask,
  createNotionTask,
  getNotionTask,
  getNotionTasks,
  updateNotionTask,
} from "@/lib/notion/tasks";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const authError = await requireUser();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const data = id ? await getNotionTask(id) : await getNotionTasks();
    return Response.json({ data });
  } catch (error) {
    console.error("Notion tasks fetch failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = await requireUser();
  if (authError) return authError;

  try {
    const todo = await request.json();
    const data = await createNotionTask(todo);
    return Response.json({ data });
  } catch (error) {
    console.error("Notion task create failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const authError = await requireUser();
  if (authError) return authError;

  try {
    const { id, updates } = await request.json();
    if (!id) return Response.json({ error: "Missing task id" }, { status: 400 });
    const data = await updateNotionTask(id, updates || {});
    return Response.json({ data });
  } catch (error) {
    console.error("Notion task update failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authError = await requireUser();
  if (authError) return authError;

  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: "Missing task id" }, { status: 400 });
    await archiveNotionTask(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Notion task archive failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function requireUser() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? null : Response.json({ error: "Unauthorized" }, { status: 401 });
}
