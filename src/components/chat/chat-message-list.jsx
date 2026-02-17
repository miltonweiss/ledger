"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SOURCE_PATTERN = /\[Source\s+(\d+)\]/gi;

function getMessageText(message) {
  if (!message) return "";

  const textParts = Array.isArray(message.parts)
    ? message.parts
        .filter((part) => part?.type === "text")
        .map((part) => part.text || "")
        .join("")
    : "";

  if (textParts) return textParts;
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;

  return "";
}

function normalizeChunks(rawChunks) {
  if (!Array.isArray(rawChunks)) return [];

  return rawChunks
    .map((chunk, index) => {
      if (!chunk || typeof chunk !== "object") return null;

      const sourceNumberRaw =
        chunk.source ?? chunk.sourceId ?? chunk.source_number ?? chunk.index ?? chunk.rank;
      const parsedSource = Number(sourceNumberRaw);
      const source = Number.isFinite(parsedSource) && parsedSource > 0 ? parsedSource : index + 1;

      const rawScore = Number(chunk.score ?? chunk.similarity ?? chunk.relevance);
      const score = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(1, rawScore))
        : null;

      const preview =
        chunk.preview ||
        chunk.snippet ||
        chunk.text ||
        chunk.content ||
        chunk.pageContent ||
        "No source preview available yet.";

      return {
        source,
        score,
        title: chunk.title ? String(chunk.title) : null,
        id: chunk.id ? String(chunk.id) : null,
        preview: String(preview),
      };
    })
    .filter(Boolean);
}

function getChunksFromPart(part) {
  if (!part || typeof part !== "object") return [];

  if (part.type === "rag_context") {
    return normalizeChunks(part.chunks);
  }

  if (part.type === "data-rag_context") {
    return normalizeChunks(part.chunks || part.data?.chunks);
  }

  if (part.type === "data" && part.data?.type === "rag_context") {
    return normalizeChunks(part.data.chunks);
  }

  if (typeof part.type === "string" && part.type.startsWith("data-") && part.data?.chunks) {
    return normalizeChunks(part.data.chunks);
  }

  return [];
}

function extractRagChunksFromMessage(message) {
  if (!Array.isArray(message?.parts)) return [];

  const collected = [];
  message.parts.forEach((part) => {
    const chunks = getChunksFromPart(part);
    if (chunks.length) {
      collected.push(...chunks);
    }
  });

  return collected;
}

function SourceRef({ sourceNumber, chunk }) {
  const scoreLabel =
    typeof chunk?.score === "number" ? `${Math.round(chunk.score * 100)}% match` : null;

  return (
    <span className="source-ref" role="note" aria-label={`Source ${sourceNumber}`}>
      {sourceNumber}
      <span className="source-tooltip">
        <span className="source-tooltip-header">
          <span className="source-tooltip-title">Source {sourceNumber}</span>
          {scoreLabel ? <span className="source-tooltip-score">{scoreLabel}</span> : null}
        </span>
        <span className="source-tooltip-body">
          {chunk?.title ? <span className="source-tooltip-meta">{chunk.title}</span> : null}
          {chunk?.preview || "No source preview available yet."}
        </span>
      </span>
    </span>
  );
}

function AssistantMessage({ content, chunks }) {
  const sourceMap = useMemo(() => {
    const map = {};
    chunks.forEach((chunk, index) => {
      const number = chunk.source ?? index + 1;
      map[number] = chunk;
    });
    return map;
  }, [chunks]);

  const renderedContent = useMemo(
    () => content.replace(SOURCE_PATTERN, (_, sourceNumber) => `[${sourceNumber}](source://${sourceNumber})`),
    [content],
  );

  const hasInlineSources = useMemo(() => /\[Source\s+\d+\]/i.test(content), [content]);

  return (
    <div className="markdown-content rag-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (typeof href === "string" && href.startsWith("source://")) {
              const sourceNumber = Number(href.replace("source://", ""));
              return (
                <SourceRef
                  sourceNumber={sourceNumber}
                  chunk={sourceMap[sourceNumber] || null}
                />
              );
            }

            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>

      {!hasInlineSources && chunks.length > 0 ? (
        <div className="source-footer">
          <span className="source-footer-label">Sources:</span>
          {chunks.map((chunk, index) => (
            <SourceRef
              key={`footer-source-${chunk.source}-${index}`}
              sourceNumber={chunk.source ?? index + 1}
              chunk={chunk}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-live="polite">
      <span className="typing-label">Thinking</span>
      <span className="typing-dots">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

export default function ChatMessageList({
  messages = [],
  fallbackAssistantChunks = [],
  isLoading = false,
}) {
  const endRef = useRef(null);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  const lastAssistantIndex = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      if (visibleMessages[i].role === "assistant") return i;
    }
    return -1;
  }, [visibleMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages, isLoading]);

  return (
    <div className="chat-thread">
      {visibleMessages.map((message, index) => {
        const isUser = message.role === "user";
        const isWelcomeMessage = !isUser && (message.id === "init" || index === 0);
        const text = getMessageText(message);
        const messageChunks = isUser ? [] : extractRagChunksFromMessage(message);
        const effectiveChunks =
          !isUser && messageChunks.length === 0 && index === lastAssistantIndex
            ? normalizeChunks(fallbackAssistantChunks)
            : messageChunks;

        return (
          <div
            key={message.id || `${message.role}-${index}`}
            className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}
          >
            {isUser ? (
              <div className="message-bubble-user">{text}</div>
            ) : (
              <div
                className={`message-bubble-assistant ${
                  isWelcomeMessage ? "message-bubble-assistant-welcome" : ""
                }`}
              >
                <AssistantMessage content={text} chunks={effectiveChunks} />
              </div>
            )}
          </div>
        );
      })}

      {isLoading ? (
        <div className="message-row message-row-assistant">
          <div className="message-bubble-assistant">
            <TypingIndicator />
          </div>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
