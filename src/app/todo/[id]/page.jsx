"use client";
import Image from "next/image";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import ToDoList from "@/components/todolist";
import { useParams } from "next/navigation";

export default function todo() {
  const params = useParams();
  const todoId = params.id;
  return (
    <div className="p-[0.5rem] flex flex-col h-full min-h-[calc(100vh-3rem)]">
      <Header
      
      emph={todoId}
      />
      
    </div>
  );
}
