"use client";

import { useState } from "react";
import { Dashboard, Habits, ToDo, Notes, Bubble, Bookmark, Chatbubble } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Themeswap from "./themeswap";
import { ChevronRight } from "lucide-react";

const iconMap = {
  dashboard: Dashboard,
  todo: Habits,
  habits: ToDo,
  notes: Notes,
  bubble: Bubble,
  bookmark: Bookmark,
  chatbubble: Chatbubble,
};

export default function NavBar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  const links = [
    { href: "/", name: "Dashboard", icon: "dashboard" },
    { href: "/todo", name: "To Do's", icon: "todo" },
    { href: "/chat", name: "AI-Chat", icon: "chatbubble" },
    { href: "/components", name: "Components", icon: "bookmark" },
  ];

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen 
        ${collapsed ? "w-16" : "w-56"}
        foreground
        bg-neutral-950 border-r border-neutral-800
        flex flex-col justify-between py-6
        transition-all duration-300 ease-in-out
        z-50
      `}
    >
      {/* Top */}
      <div className="flex flex-col gap-10">

        {/* Logo + Toggle */}
        <div className="flex items-center justify-between px-4">
          {!collapsed && (
            <span className="text-lg font-semibold text-white tracking-wide">
              Ledger
            </span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <ChevronRight
              className={`transition-transform duration-300 ${
                collapsed ? "" : "rotate-180"
              }`}
              size={18}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-2">
          {links.map((link) => {
            const IconComponent = iconMap[link.icon];
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative flex items-center gap-4
                  px-3 py-2 rounded-xl
                  transition-all duration-200
                  ${isActive
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"}
                `}
              >
                <IconComponent />

                {!collapsed && (
                  <span className="text-sm font-medium">
                    {link.name}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded-r-md" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex justify-center px-2">
        <Themeswap />
      </div>
    </aside>
  );
}
