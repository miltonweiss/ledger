"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types (even without TypeScript, this documents the contract) ---
// Chunk: { source: number, score: number | null, title: string | null, preview: string }
// Message: { id: string, role: "user" | "assistant" | "system", parts: Part[] }
// Part (text): { type: "text", text: string }
// Part (rag):  { type: "rag_context", chunks: Chunk[] }

const SOURCE_LINK_RE = /\[(?:sources?)[^\]]*?\]/gi;
const SOURCE_NUMS_RE = /\d+/g;
const CODE_FENCE_RE = /(```[\s\S]*?```|`[^`]+`)/g;
const SAFE_HREF_RE = /^https?:\/\//i;
const SCROLL_THRESHOLD = 160;

// ─── Data extraction ────────────────────────────────────────────────

function textFromMessage(message) {
  if (!message) return "";

  // Primary path: parts array from AI SDK
  if (Array.isArray(message.parts)) {
    const text = message.parts
      .filter((p) => p?.type === "text")
      .map((p) => p.text ?? "")
      .join("");
    if (text) return text;
  }

  // Legacy fallbacks
  return message.text ?? message.content ?? "";
}

function chunksFromMessage(message) {
  if (!Array.isArray(message?.parts)) return [];

  const chunks = [];
  for (const part of message.parts) {
    // AI SDK delivers writer.write({ type: 'data-rag_context', data: {...} })
    // as a part with type "data-rag_context" and payload under .data
    const rawChunks =
      part?.type === "rag_context"
        ? part.chunks
        : part?.type === "data-rag_context"
          ? part.data?.chunks
          : null;

    if (!Array.isArray(rawChunks)) continue;

    for (let i = 0; i < rawChunks.length; i++) {
      const raw = rawChunks[i];
      if (!raw || typeof raw !== "object") continue;

      const sourceNum = Number(raw.source ?? i + 1);
      const rawScore = Number(raw.score);

      chunks.push({
        source: Number.isFinite(sourceNum) && sourceNum > 0 ? sourceNum : i + 1,
        score: Number.isFinite(rawScore) ? Math.max(0, Math.min(1, rawScore)) : null,
        title: raw.title ? String(raw.title) : null,
        preview: String(raw.preview || raw.text || ""),
      });
    }
  }

  return chunks;
}

// ─── Citation transformation ────────────────────────────────────────

function rewriteCitations(markdown, sourceMap) {
  if (!markdown) return "";

  const segments = markdown.split(CODE_FENCE_RE);

  return segments
    .map((seg) => {
      if (!seg) return "";
      if (seg.startsWith("`")) return seg; // code — leave alone

      return seg.replace(SOURCE_LINK_RE, (match) => {
        const nums = (match.match(SOURCE_NUMS_RE) || [])
          .map(Number)
          .filter((n) => n > 0 && sourceMap.has(n));

        if (!nums.length) return match;

        return nums.map((n) => `[${n}](source://${n})`).join(" ");
      });
    })
    .join("");
}

// ─── Components ─────────────────────────────────────────────────────

function SourceChip({ num, chunk }) {
  const score =
    typeof chunk?.score === "number" ? `${Math.round(chunk.score * 100)}%` : null;

  return (
    <span className="source-ref" role="note" aria-label={`Source ${num}`}>
      {num}
      <span className="source-tooltip">
        <span className="source-tooltip-header">
          <span className="source-tooltip-title">Source {num}</span>
          {score && <span className="source-tooltip-score">{score} match</span>}
        </span>
        <span className="source-tooltip-body">
          {chunk?.title && <span className="source-tooltip-meta">{chunk.title}</span>}
          {chunk?.preview || "No preview available."}
        </span>
      </span>
    </span>
  );
}

function AssistantMessage({ content, chunks }) {
  const sourceMap = useMemo(() => {
    const map = new Map();
    chunks.forEach((c, i) => map.set(c.source ?? i + 1, c));
    return map;
  }, [chunks]);

  const transformed = useMemo(
    () => rewriteCitations(content, sourceMap),
    [content, sourceMap],
  );

  const hasInlineSources = useMemo(
    () => /\]\(source:\/\/\d+\)/.test(transformed),
    [transformed],
  );

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children }) => {
        if (typeof href === "string" && href.startsWith("source://")) {
          const num = Number(href.replace("source://", ""));
          const chunk = sourceMap.get(num);
          if (!chunk) return <span>{children}</span>;
          return <SourceChip num={num} chunk={chunk} />;
        }

        if (!SAFE_HREF_RE.test(href ?? "")) return <span>{children}</span>;

        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
    }),
    [sourceMap],
  );

  return (
    <div className="markdown-content rag-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {transformed}
      </ReactMarkdown>

      {!hasInlineSources && chunks.length > 0 && (
        <div className="source-footer">
          <span className="source-footer-label">Sources:</span>
          {chunks.map((c, i) => (
            <SourceChip
              key={c.source ?? i}
              num={c.source ?? i + 1}
              chunk={c}
            />
          ))}
        </div>
      )}
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

// ─── Main component ─────────────────────────────────────────────────

export default function ChatMessageList({
  messages = [],
  isLoading = false,
}) {
  const endRef = useRef(null);
  const autoScrollRef = useRef(true);

  const visible = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages],
  );

  const showTyping = useMemo(() => {
    if (!isLoading) return false;
    const last = visible[visible.length - 1];
    return !last || last.role !== "assistant" || !textFromMessage(last).trim();
  }, [visible, isLoading]);

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => {
      const bottom = window.scrollY + window.innerHeight;
      autoScrollRef.current =
        bottom >= document.documentElement.scrollHeight - SCROLL_THRESHOLD;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll
  useEffect(() => {
    const last = visible[visible.length - 1];
    if (last?.role === "user") autoScrollRef.current = true;
    if (!autoScrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({
        behavior: isLoading ? "auto" : "smooth",
        block: "end",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, isLoading]);

  return (
    <div className="chat-thread">
      {visible.map((message, index) => {
        const isUser = message.role === "user";
        const text = textFromMessage(message);
        const chunks = isUser ? [] : chunksFromMessage(message);
        const isWelcome = !isUser && (message.id === "init" || index === 0);

        return (
          <div
            key={message.id || `${message.role}-${index}`}
            className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}
          >
            {isUser ? (
              <div className="message-bubble-user">{text}</div>
            ) : (
              <div
                className={`message-bubble-assistant${isWelcome ? " message-bubble-assistant-welcome" : ""}`}
              >
                <AssistantMessage content={text} chunks={chunks} />
              </div>
            )}
          </div>
        );
      })}

      {showTyping && (
        <div className="message-row message-row-assistant">
          <div className="message-bubble-assistant">
            <TypingIndicator />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}