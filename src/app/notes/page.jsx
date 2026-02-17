"use client";
import { useState, useEffect} from "react";
import Header from "@/components/header";
import Image from "next/image";
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'

export default function notes() {
    const notesHeadlines = [
        { deemphasized: "Your personal", emphasized: "Notes" },
        { deemphasized: "Write it down in", emphasized: "Notes" },
        { deemphasized: "Thoughts, captured in", emphasized: "Notes" },
        { deemphasized: "A space for your", emphasized: "Notes" },
        { deemphasized: "Ideas live in your", emphasized: "Notes" },
        { deemphasized: "Keep track with", emphasized: "Notes" },
        { deemphasized: "From thought to", emphasized: "Note" },
        { deemphasized: "Everything worth remembering,", emphasized: "Noted" },
        { deemphasized: "Your ideas,", emphasized: "Organized" },
        { deemphasized: "A place to think,", emphasized: "Notes" }
      ];
      

  const [randint, setRandint] = useState(0);

  useEffect(() => {
    setRandint(Math.floor(Math.random() * notesHeadlines.length));
  }, []);
  return (
    <div className="p-[0.5rem]">
     <Header
      demph={notesHeadlines[randint].deemphasized}
      emph={notesHeadlines[randint].emphasized}
      />

      <div className="p-[0.5rem] flex flex-col h-full min-h-[calc(100vh-3rem)]" >
      <SimpleEditor />
      </div>
    </div>
  );
}
