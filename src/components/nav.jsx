"use client";

import { Dashboard, Habits, ToDo, Notes, Bubble, Bookmark, Chatbubble } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Themeswap from "./themeswap";

const iconMap = {
  dashboard: Dashboard,
  todo: ToDo,
  habits: Habits,
  notes: Notes,
  bubble: Bubble,
  bookmark: Bookmark,
  chatbubble: Chatbubble,
};

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", name: "Dashboard", icon: "dashboard" },
    { href: "/todo", name: "To Do's", icon: "todo" },
    { href: "/chat", name: "AI-Chat", icon: "chatbubble" },
    { href: "/notes", name: "Notes", icon: "notes" },
  ];

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-950/80 backdrop-blur-md border border-neutral-800 rounded-2xl px-3 py-2 flex items-center gap-1 z-50 shadow-2xl"
    >
      {links.map((link) => {
        const IconComponent = iconMap[link.icon];
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "dock-item flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200",
              isActive
                ? "dock-item-active"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/50",
            ].join(" ")}
          >
            <IconComponent size={20} />
            <span className="text-[10px] font-medium mt-1">
              {link.name}
            </span>
          </Link>
        );
      })}

      <div className="w-px h-8 bg-neutral-800 mx-2" />

      <div className="px-2 flex items-center justify-center">
        <Themeswap />
      </div>
    </nav>
  );
}
