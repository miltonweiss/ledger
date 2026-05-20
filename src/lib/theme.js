"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const isDarkMode = savedTheme === "dark";
    setIsDark(isDarkMode);
    document.documentElement.setAttribute("data-theme", savedTheme);
    setMounted(true);
  }, []);

  function setTheme(theme) {
    const isDarkMode = theme === "dark";
    setIsDark(isDarkMode);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return { isDark, toggleTheme, setTheme, mounted };
}
