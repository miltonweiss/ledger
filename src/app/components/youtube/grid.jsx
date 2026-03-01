"use client";
import { useState } from "react";

function getTranscriptStatus(transcript) {
  if (transcript === null) return "loading";
  if (Array.isArray(transcript) && transcript.length > 0) return "success";
  if (transcript?.message) return "error";
  if (Array.isArray(transcript) && transcript.length === 0) return "empty";
  return "unknown";
}

function getFullText(transcript) {
  if (Array.isArray(transcript) && transcript.length > 0) {
    return transcript.map((item) => item.text).join(" ");
  }
  return null;
}

function getPreviewText(transcript, maxLen = 120) {
  const full = getFullText(transcript);
  if (!full) return null;
  return full.length > maxLen ? full.substring(0, maxLen) + "…" : full;
}

function getErrorText(transcript) {
  if (transcript?.message) return transcript.message;
  return "No transcript found.";
}

function VideoRow({ videoId, transcript, index }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const status = getTranscriptStatus(transcript);
  const fullText = getFullText(transcript);
  const preview = getPreviewText(transcript);

  function copyToClipboard() {
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--border-default)",
        animation: `fadeUp 0.25s ease-out ${index * 0.02}s both`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status dot */}
          <div
            className="flex-shrink-0"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background:
                status === "loading"
                  ? "var(--text-muted)"
                  : status === "success"
                  ? "var(--accent)"
                  : "#ef4444",
              opacity: status === "loading" ? 0.4 : 1,
              animation:
                status === "loading" ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate"
            style={{
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              textDecoration: "none",
              fontFamily: "monospace",
            }}
          >
            {videoId}
          </a>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "success" && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--accent)",
                  background: "var(--orange-muted)",
                  border: "1px solid var(--orange-border)",
                  borderRadius: 6,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {copied ? (
                    <polyline points="20 6 9 17 4 12" />
                  ) : (
                    <>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </>
                  )}
                </svg>
                {copied ? "Copied" : "Copy"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {status === "loading" && (
        <div className="flex items-center gap-2 mt-1.5 ml-[19px]">
          <div
            style={{
              width: 12,
              height: 12,
              border: "1.5px solid var(--border-default)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span className="deemphasize" style={{ fontSize: "0.8rem" }}>
            Fetching…
          </span>
        </div>
      )}

      {status === "success" && (
        <p
          className="ml-[19px] mt-1"
          style={{
            fontSize: "0.82rem",
            lineHeight: 1.65,
            color: "var(--text-secondary)",
            margin: 0,
            marginLeft: 19,
            marginTop: 4,
            whiteSpace: expanded ? "pre-wrap" : "nowrap",
            overflow: expanded ? "visible" : "hidden",
            textOverflow: expanded ? "unset" : "ellipsis",
            maxHeight: expanded ? "none" : "1.65em",
          }}
        >
          {expanded ? fullText : preview}
        </p>
      )}

      {(status === "error" || status === "empty" || status === "unknown") && (
        <p
          className="ml-[19px] mt-1"
          style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            margin: 0,
            marginLeft: 19,
            marginTop: 4,
          }}
        >
          {getErrorText(transcript)}
        </p>
      )}
    </div>
  );
}

function GridComponent({ data, count, setCount }) {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!data || data.length === 0) return null;

  const allTranscripts = data
    .filter(
      (pair) =>
        Array.isArray(pair) &&
        Array.isArray(pair[1]) &&
        pair[1].length > 0
    )
    .map((pair) => pair[1].map((item) => item.text).join(" "));

  const allDone = data.every((pair) => Array.isArray(pair) && pair[1] !== null);

  function copyAll() {
    if (allTranscripts.length === 0) return;
    const combined = allTranscripts.join("\n\n---\n\n");
    navigator.clipboard.writeText(combined);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <div>
      {/* Bulk action bar */}
      {allDone && allTranscripts.length > 0 && (
        <div
          className="flex items-center justify-end px-5 py-3"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <button
            onClick={copyAll}
            className="flex items-center gap-1.5"
            style={{
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--accent)",
              background: "var(--orange-muted)",
              border: "1px solid var(--orange-border)",
              borderRadius: 8,
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {copiedAll ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
              )}
            </svg>
            {copiedAll ? "Copied All" : "Copy All"}
          </button>
        </div>
      )}

      {/* Video rows */}
      {data.map((pair, index) => {
        const [videoId, transcript] = Array.isArray(pair)
          ? pair
          : [pair, null];
        return (
          <VideoRow
            key={`${videoId}-${index}`}
            videoId={videoId}
            transcript={transcript}
            index={index}
          />
        );
      })}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default GridComponent;