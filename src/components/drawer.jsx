"use client"
import { Archive, AddPlus, Trash } from "./icons"
import { useEffect, useState } from "react"
import { getChats, deleteChat } from "@/lib/supabase/chats"
import Link from "next/link"

export function ChatDrawerToggle() {
    return (
        <label htmlFor="my-drawer-5" className="drawer-button btn foreforeforeground borderDefault shadow-transparent drop-shadow-none">
            <Archive />
        </label>
    )
}

export default function ChatDrawer ({ children }){
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)

    async function fetchChats() {
        setLoading(true)
        const data = await getChats()
        setChats(data)
        setLoading(false)
    }

    async function handleDelete(e, chatId) {
        e.preventDefault()
        e.stopPropagation()
        const success = await deleteChat(chatId)
        if (success) {
            setChats(prev => prev.filter(c => c.id !== chatId))
        }
    }

    useEffect(() => {
        fetchChats()
    }, [])

    return(
        <div className="drawer drawer-end">
            <input id="my-drawer-5" type="checkbox" className="drawer-toggle" onChange={(e) => {
                if (e.target.checked) fetchChats()
            }} />
            <div className="drawer-content">
                {children}
            </div>
            <div className="drawer-side z-[999]">
                <label htmlFor="my-drawer-5" aria-label="close sidebar" className="drawer-overlay"></label>
                <ul className="menu foreforeforeground min-h-full gap-2 w-80 p-4">
                    <li className="menu-title text-base mb-2">Chat History</li>
                    <li className="mb-2">
                        <Link href="/chat" className="flex items-center  font-medium">
                            <AddPlus /> New Chat
                        </Link>
                    </li>
                    {loading ? (
                        <li className="p-4 text-center opacity-50">Loading...</li>
                    ) : chats.length === 0 ? (
                        <li className="p-4 text-center opacity-50">No chats yet</li>
                    ) : (
                        chats.map((chat) => (
                            <li key={chat.id}>
                                <div className="flex items-center  justify-between rounded-md w-full p-2">
                                    <Link href={`/chat/${chat.id}`} className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                                        <span className="font-medium truncate w-full">{chat.name}</span>
                                        {chat.personality && (
                                            <span className="text-xs opacity-50">{chat.personality}</span>
                                        )}
                                    </Link>
                                    <button
                                        onClick={(e) => handleDelete(e, chat.id)}
                                        className=" bg-transparent  opacity-40 hover:opacity-100 !border-none hover:!border-none hover:text-red-500 ml-2 shrink-0 shadow-none"
                                    >
                                        <Trash />
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    )
}
