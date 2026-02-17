"use client";
import { ExtraPlus, Send } from "@/components/icons";
import Header from "@/components/header"
import ChatDrawer, { ChatDrawerToggle } from "@/components/drawer"
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import personalities from '../../../prompts';
import { createChat, updateChat } from '@/lib/supabase/chats';
import ChatMessageList from "@/components/chat/chat-message-list";

export default function ChatApp (){
    const [input, setInput] = useState('');
    const [personality, setPersonality] = useState(0);
    const [chatId, setChatId] = useState(null);
    const chatNameRef = useRef(null);
    const messagesRef = useRef([]);
    const lastSavedUserIdRef = useRef(null);
    const lastSavedAssistantIdRef = useRef(null);

    async function saveChat (messagesToSave) {
      const currentPersonality = personalities[personality]?.name || String(personality);
      if (!chatNameRef.current) {
        chatNameRef.current = new Date().toISOString();
      }

      const conversation = messagesToSave.map((message) => {
        const textParts = (message.parts || [])
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
        const fallbackText = message.text || message.content || '';

        return {
          id: message.id,
          role: message.role,
          text: textParts || fallbackText
        };
      });

      const payload = {
        conversation,
        name: chatNameRef.current,
        personality: currentPersonality
      };

      if (!chatId) {
        const created = await createChat(payload);
        if (created?.id) {
          setChatId(created.id);
        }
        return;
      }

      await updateChat(chatId, payload);
    }

    const { messages, sendMessage, data, status } = useChat({
      api: '/api/chat-rag',
      onFinish: (message) => {
        if (lastSavedAssistantIdRef.current === message.id) return;
        lastSavedAssistantIdRef.current = message.id;

        const currentMessages = messagesRef.current;
        const hasMessage = currentMessages.some(m => m.id === message.id);
        const messagesToSave = hasMessage ? currentMessages : [...currentMessages, message];

        saveChat(messagesToSave);
      }
    });
    const isLoading = status === 'submitted' || status === 'streaming';
    const isInputEmpty = !input.trim();
    const streamRagChunks = useMemo(() => {
      if (!Array.isArray(data)) return [];

      const latestRagContext = [...data].reverse().find((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        if (entry.type === 'rag_context' || entry.type === 'data-rag_context') return true;
        return entry.type === 'data' && entry.data?.type === 'rag_context';
      });

      const chunks = latestRagContext?.chunks || latestRagContext?.data?.chunks;
      return Array.isArray(chunks) ? chunks : [];
    }, [data]);

    useEffect(() => {
      messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
      if (!messages.length) return;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') return;
      if (lastSavedUserIdRef.current === lastMessage.id) return;
      lastSavedUserIdRef.current = lastMessage.id;

      saveChat(messages);
    }, [messages]);

    return(
        <ChatDrawer>
        <div >
            <div className="flex items-center sticky w-[100%] relative">
            <Header
            demph={"Your"}
                emph={"AI Assistant"}

      />
      <div className="absolute  right-0">
      <ChatDrawerToggle />
      </div>
            </div>
            
      <div className="foreground min-h-[85vh] borderDefault pb-100 py-4 px-4 md:px-20 pb-32">
        <ChatMessageList
          messages={messages}
          fallbackAssistantChunks={streamRagChunks}
          isLoading={isLoading}
        />
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!isInputEmpty && !isLoading) {
            sendMessage({ text: input }, { body: { personality } });
            setInput('');
          }
        }}
        className="fixed foreforeground bottom-4 left-[5vw] p-2  right-0 mx-auto w-[50vw] z-50 borderDefault"
      >
        <div>
        <textarea
          className=" focus:ring-0 focus:ring-offset-0  w-full p-2 resize-none rounded-lg"
          value={input}
          placeholder="What do you want tell the AI?"
          disabled={isLoading}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isInputEmpty && !isLoading) {
                sendMessage({ text: input }, { body: { personality } });
                setInput('');
              }
            }
          }}
        />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-row">
            <button type="button" className=" p-2 foreforeforeground flex btn opacityHover"><ExtraPlus/></button>
            <select 
              value={personality} 
              onChange={(e) => setPersonality(Number(e.target.value))}
              className="select foreforeforeground border-none py-1"
            >
              {personalities.map((person) => {
                return(
                  <option key={person.id} value={person.id}>{person.name}</option>
                )
              })}
            </select>
          </div>
         <div>
          <button type="submit" disabled={isInputEmpty || isLoading} className=" p-2 btn foreforeforeground opacityHover"><Send/></button>
         </div>
        </div>
       
      </form>
        </div>
        </ChatDrawer>
    )
}
