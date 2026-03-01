"use client";
import { useState } from "react";

function getYouTubeVideoId(url) {
  const match = url.match(
    /(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function TranscriptPageContent() {
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  

  function fetchTranscript(videoId) {
    if (!videoId) {
      setTranscript({ message: "That doesn't look like a valid YouTube URL." });
      return;
    }
    setLoading(true);
    setTranscript(null);
    fetch(`/api/transcript?videoId=${videoId}`)
      .then((res) =>
        res.json().then((data) =>
          !res.ok
            ? { message: data?.message || "Transcript unavailable for this video." }
            : data
        )
      )
      .then((data) => {
        setTranscript(data);
        setLoading(false);
      })
      .catch(() => {
        setTranscript({ message: "Something went wrong. Please try again." });
        setLoading(false);
      });
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!videoUrl.trim()) return;
    fetchTranscript(getYouTubeVideoId(videoUrl));
  }

  const hasTranscriptText =
    transcript && Array.isArray(transcript) && transcript.length > 0;
  const transcriptText = hasTranscriptText
    ? transcript.map((item) => item.text).join(" ")
    : null;
  const errorMessage =
    transcript && !Array.isArray(transcript) ? transcript.message : null;
  const emptyResult =
    transcript && Array.isArray(transcript) && transcript.length === 0;

  function copyToClipboard() {
    if (transcriptText) {
      navigator.clipboard.writeText(transcriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="background flex flex-col min-h-screen items-center px-5">

      

      {/* Input card */}
      <form onSubmit={handleSubmit} className="w-full max-w-[640px]">
        <div
          className="foreground transition-all duration-200"
          style={{
            borderRadius: 14,
            padding: 6,
            border: inputFocused
              ? "1.5px solid var(--accent)"
              : "1.5px solid var(--border-default)",
            boxShadow: inputFocused ? "0 0 0 3px rgba(232, 139, 90, 0.12)" : "none",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center ml-2" style={{ color: "var(--text-muted)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>

            <input
              type="text"
              placeholder="Paste a YouTube URL…"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              className="flex-1 bg-transparent py-3.5"
              style={{
                border: "none",
                outline: "none",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
              }}
            />

            <button
              type="submit"
              disabled={!videoUrl.trim() || loading}
              className="accent-bg flex-shrink-0 w-[42px] h-[42px] flex items-center justify-center mr-0.5"
              style={{
                borderRadius: 12,
                border: "none",
                opacity: !videoUrl.trim() || loading ? 0.35 : 1,
                cursor: !videoUrl.trim() || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading */}
      {loading && !transcript && (
        <div className="w-full max-w-[640px] mt-6" style={{ animation: "fadeUp 0.35s ease-out" }}>
          <div
            className="foreground flex flex-col items-center gap-4 py-8"
            style={{ borderRadius: 14, border: "1.5px solid var(--border-default)" }}
          >
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            <span className="deemphasize" style={{ fontSize: "0.875rem" }}>
              Fetching transcript…
            </span>
          </div>
        </div>
      )}

      {/* Result */}
      {!loading && transcript && (
        <div className="w-full max-w-[640px] mt-6" style={{ animation: "fadeUp 0.35s ease-out" }} key={Date.now()}>
          <div
            className="foreground overflow-hidden"
            style={{ borderRadius: 14, border: "1.5px solid var(--border-default)" }}
          >
            {hasTranscriptText ? (
              <>
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: "1px solid var(--border-default)" }}
                >
                  <span className="deemphasize bold" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Transcript
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "var(--accent)",
                      background: "var(--orange-muted)",
                      border: "1px solid var(--orange-border)",
                      borderRadius: 8,
                      padding: "5px 12px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                </div>

                <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: 400 }}>
                  <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {transcriptText}
                  </p>
                </div>
              </>
            ) : (
              <div className="px-5 py-6">
                <div className="flex items-center gap-2.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                    {errorMessage || (emptyResult ? "No transcript found for this video." : "No transcript found.")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {!loading && !transcript && (
        <p className="deemphasize mt-5 text-center pb-8" style={{ fontSize: "0.78rem" }}>
          Press{" "}
          <span
            className="foreforeground"
            style={{ fontSize: "0.7rem", border: "1px solid var(--border-default)", borderRadius: 5, padding: "2px 7px", margin: "0 2px" }}
          >
            Enter
          </span>{" "}
          or click the arrow to fetch
        </p>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
