"use client";
import Header from "@/components/header"
import { useState } from "react"
export default function MarkdownChunk() {
    const [text, setText] = useState("")
    function handleInput (e) {
        setText(e.target.value)
        }
    return (
        <div>
            <Header
            demph={"Turn your "}
            emph={"Markdown files into chunks"}
      />
      <div className="foreground h-[85vh] flex items-center justify-center gap-4 flex-col borderDefault">
        <textarea className="w-[50vw] h-[50vh] p-4 rounded-lg borderDefault foreforeground" onChange={handleInput} />
        <p>{text}</p>
        <button className="btn accent-bg">Chunk</button>
        
      </div>
        </div>
    )
}