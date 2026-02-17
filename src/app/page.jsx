"use client";
import Image from "next/image";
import Header from "@/components/header";
import { useState, useEffect } from "react";


export default function todo() {
  const dashboardHeadlines = [
    { deemphasized: "Your", emphasized: "Dashboard" },
    { deemphasized: "This is your", emphasized: "Dashboard" },
    { deemphasized: "At a glance:", emphasized: "Dashboard" },
    { deemphasized: "Welcome to your", emphasized: "Dashboard" },
    { deemphasized: "All in one", emphasized: "Dashboard" },
    { deemphasized: "Your personal", emphasized: "Overview" },
    { deemphasized: "Everything in your", emphasized: "Dashboard" },
    { deemphasized: "Your daily", emphasized: "Overview" },
    { deemphasized: "This is your", emphasized: "Workspace" },
    { deemphasized: "Your productivity", emphasized: "Hub" }
  ];
  

  const [randint, setRandint] = useState(0);

  useEffect(() => {
    setRandint(Math.floor(Math.random() * dashboardHeadlines.length));
  }, []);

  
  return (
    <div className="p-[0.5rem]">
      <Header
      demph={dashboardHeadlines[randint].deemphasized}
      emph={dashboardHeadlines[randint].emphasized}
      />
     
    </div>
  );
}
