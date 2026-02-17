"use client";
import Image from "next/image";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import ToDoList from "@/components/todolist";

export default function todo() {
  const todoHeadlines = [
    { deemphasized: "What’s on your", emphasized: "To Do?" },
    { deemphasized: "This is your", emphasized: "To Do" },
    { deemphasized: "Things to get", emphasized: "Done" },
    { deemphasized: "Plan your", emphasized: "To Do" },
    { deemphasized: "Focus on what’s", emphasized: "Next" },
    { deemphasized: "Your tasks,", emphasized: "Organized." },
    { deemphasized: "Everything you need ", emphasized: "to Do" },
    { deemphasized: "Turn plans into", emphasized: "Actions" },
    { deemphasized: "What needs to get", emphasized: "Done?" },
    { deemphasized: "Your daily", emphasized: "Tasks" }
  ];

  const [randint, setRandint] = useState(0);

  useEffect(() => {
    setRandint(Math.floor(Math.random() * todoHeadlines.length));
  }, []);

  
 
  return (
    <div className="p-[0.5rem] flex flex-col h-full min-h-[calc(100vh-3rem)]">
      <Header
      demph={todoHeadlines[randint].deemphasized}
      emph={todoHeadlines[randint].emphasized}
      />
      <ToDoList 
     
         />
    </div>
  );
}
