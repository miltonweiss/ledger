"use client";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/header";
import dynamic from "next/dynamic";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import throttle from "lodash.throttle";
import { redToast } from "@/components/toasts";

const SimpleEditor = dynamic(
    () => import("@/components/tiptap-templates/simple/simple-editor").then((mod) => mod.SimpleEditor),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-[220px]">
                <Loader2 className="animate-spin opacity-30" />
            </div>
        ),
    },
);

function extractTextPreview(content, max = 60) {
    if (!content?.content) return "";
    const texts = [];
    const walk = (nodes) => nodes?.forEach(n => {
        if (n.type === "text" && n.text) texts.push(n.text);
        if (n.content) walk(n.content);
    });
    walk(content.content);
    const text = texts.join(" ").trim();
    return text.length > max ? text.slice(0, max) + "…" : text;
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [activeNote, setActiveNote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNoteLoading, setIsNoteLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [noteError, setNoteError] = useState("");

    // Fetch all notes
    const fetchNotes = async () => {
        try {
            const res = await fetch("/api/notes");
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to fetch notes");
            }
            const data = await res.json();
            setNotes(Array.isArray(data) ? data : []);
            setNoteError("");
        } catch (error) {
            console.error("Failed to fetch notes:", error);
            setNoteError(error.message);
            redToast("Notes unavailable", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Load active note
    useEffect(() => {
        if (!activeNoteId) {
            setActiveNote(null);
            setIsNoteLoading(false);
            return;
        }

        let cancelled = false;
        async function loadNote() {
            setIsNoteLoading(true);
            try {
                const res = await fetch(`/api/notes/${activeNoteId}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to fetch note");
                }
                const note = await res.json();
                if (!cancelled) {
                    setActiveNote(note);
                    setNoteError("");
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to fetch note:", error);
                    setActiveNote(null);
                    setNoteError(error.message);
                    redToast("Note unavailable", error.message);
                }
            } finally {
                if (!cancelled) setIsNoteLoading(false);
            }
        }

        loadNote();
        return () => {
            cancelled = true;
        };
    }, [activeNoteId]);

    // Create new note
    const handleCreateNote = async () => {
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    title: "New Note", 
                    content: { type: "doc", content: [{ type: "paragraph" }] } 
                })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create note");
            }

            const newNote = await res.json();
            setNotes(prev => [{
                id: newNote.id,
                title: newNote.title,
                preview: extractTextPreview(newNote.content),
                created_at: newNote.created_at,
                updated_at: newNote.updated_at,
            }, ...prev]);
            setActiveNoteId(newNote.id);
            setNoteError("");
        } catch (error) {
            console.error("Failed to create note:", error);
            setNoteError(error.message);
            redToast("Could not create note", error.message);
        }
    };

    // Delete note
    const handleDeleteNote = async (id, e) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to delete note");
            }
            setNotes(prev => prev.filter(n => n.id !== id));
            if (activeNoteId === id) {
                setActiveNoteId(null);
            }
            setNoteError("");
        } catch (error) {
            console.error("Failed to delete note:", error);
            setNoteError(error.message);
            redToast("Could not delete note", error.message);
        }
    };

    // Auto-save logic using a ref to store the debounced function
    const debouncedSave = useRef(
        throttle(async (id, updates) => {
            setIsSaving(true);
            try {
                const res = await fetch(`/api/notes/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates)
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to save note");
                }
                // Update local notes list to keep titles in sync
                const savedNote = await res.json();
                setNotes(prev => prev.map(n => n.id === id ? {
                    ...n,
                    title: savedNote.title,
                    preview: extractTextPreview(savedNote.content),
                    updated_at: savedNote.updated_at,
                } : n));
                setActiveNote(prev => prev?.id === id ? { ...prev, ...savedNote } : prev);
                setNoteError("");
            } catch (error) {
                console.error("Failed to save note:", error);
                setNoteError(error.message);
                redToast("Could not save note", error.message);
            } finally {
                setIsSaving(false);
            }
        }, 800, { leading: false, trailing: true }) // Using throttle as debounce-like with trailing: true
    ).current;

    const handleContentUpdate = (content) => {
        if (activeNoteId) {
            debouncedSave(activeNoteId, { content });
        }
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setActiveNote(prev => ({ ...prev, title: newTitle }));
        if (activeNoteId) {
            debouncedSave(activeNoteId, { title: newTitle });
        }
    };

    const titleInputRef = useRef(null);

    useEffect(() => {
        if (activeNoteId && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [activeNoteId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-[0.5rem] flex flex-col h-full min-h-[calc(100vh-3rem)]">
            <Header demph="Your personal" emph="Notes" />
            {noteError ? (
                <div className="mb-3 rounded-xl border border-[var(--red-border)] bg-[var(--red-muted)] px-4 py-3 text-sm text-[var(--red-accent)]">
                    {noteError}
                </div>
            ) : null}

            <div className="flex flex-1 borderDefault rounded-box overflow-hidden bg-[var(--surface-base)] min-h-0 shadow-sm">
                {/* Sidebar */}
                <div className="w-64 border-r borderDefault flex flex-col min-h-0 bg-[var(--surface-sunken)]">
                    <div className="p-4 flex justify-between items-center">
                        <div className="text-xs font-bold opacity-60 uppercase tracking-wider flex-1">Notes</div>
                        <button onClick={handleCreateNote} className="btn btn-ghost btn-xs p-0 h-8 w-8 min-h-0">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pb-4">
                        {notes.length === 0 ? (
                            <div className="p-4 text-xs opacity-50 text-center">No notes yet</div>
                        ) : (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setActiveNoteId(note.id)}
                                    className={`group mx-2 my-0.5 rounded-xl px-3 py-3 cursor-pointer note-item ${activeNoteId === note.id ? "bg-[var(--accent)]/15 text-[var(--accent-foreground)]" : "hover:bg-[var(--surface-overlay)]"}`}
                                >
                                    <div className="flex flex-col gap-1 overflow-hidden w-full relative">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className={`truncate text-sm ${activeNoteId === note.id ? "font-semibold" : "font-medium"}`}>
                                                {note.title || "Untitled"}
                                            </span>
                                            <span className={`text-[10px] shrink-0 mt-0.5 ${activeNoteId === note.id ? "opacity-70" : "opacity-40"}`}>
                                                {formatRelativeDate(note.updated_at || new Date().toISOString())}
                                            </span>
                                        </div>
                                        <div className={`text-xs note-item-preview pr-6 ${activeNoteId === note.id ? "opacity-80" : "opacity-50"}`}>
                                            {note.preview || extractTextPreview(note.content) || "No additional text"}
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteNote(note.id, e)} 
                                            className="absolute bottom-0 right-0 btn btn-ghost btn-xs p-0 h-6 w-6 min-h-0 opacity-0 group-hover:opacity-100 text-error bg-[var(--surface-sunken)] rounded-md shadow-sm"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-[var(--surface-base)]">
                    {isNoteLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin opacity-30" />
                        </div>
                    ) : activeNote ? (
                        <div key={activeNoteId} className="flex-1 flex flex-col min-h-0 notes-editor-fade">
                            <div className="px-10 pt-8 pb-4 flex items-start justify-between gap-4 w-full max-w-3xl mx-auto border-b border-transparent">
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={activeNote.title}
                                    onChange={handleTitleChange}
                                    className="text-4xl font-bold bg-transparent border-none outline-none flex-1 placeholder:opacity-30 tracking-tight"
                                    placeholder="Note Title"
                                />
                                <div className="flex items-center gap-2 shrink-0 mt-3">
                                    <div className={`save-dot ${!isSaving ? 'saved' : ''}`}></div>
                                    <span className="text-xs opacity-40 font-medium">
                                        {isSaving ? "Saving…" : formatRelativeDate(activeNote.updated_at || new Date().toISOString())}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 w-full max-w-3xl mx-auto px-10 pb-4">
                                <SimpleEditor
                                    initialContent={activeNote.content}
                                    onUpdate={handleContentUpdate}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40 gap-4">
                            <FileText size={56} strokeWidth={1} />
                            <p className="text-sm font-medium">Select a note or create a new one</p>
                            <button onClick={handleCreateNote} className="btn btn-outline btn-sm mt-2">
                                Create New Note
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
