"use client";
import { useState } from "react";
import GridComponent from "./grid";

export default function PlaylistPageContent() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistResult, setPlaylistResult] = useState(null);
  const [count, setCount] = useState(0);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [videoTranscriptPairs, setVideoTranscriptPairs] = useState([]);

  function fetchPlaylist() {
    setCount(0);
    if (!playlistUrl.trim()) return;
    setPlaylistResult(null);
    setVideoTranscriptPairs([]);
    setPlaylistLoading(true);
    fetch(`/api/playlist?playlistId=${playlistUrl}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaylistResult(data);
        setPlaylistLoading(false);
        if (
          !data.videoIds ||
          !Array.isArray(data.videoIds) ||
          data.videoIds.length === 0
        )
          return;
        const ids = data.videoIds;
        setVideoTranscriptPairs(ids.map((videoId) => [videoId, null]));
        ids.forEach((videoId, index) => {
          fetch(`/api/transcript?videoId=${videoId}`)
            .then((res) => res.json())
            .then((transcriptData) => {
              setVideoTranscriptPairs((prev) => {
                const next = [...prev];
                next[index] = [videoId, transcriptData];
                return next;
              });
            })
            .catch(() => {
              setVideoTranscriptPairs((prev) => {
                const next = [...prev];
                next[index] = [
                  videoId,
                  { message: "Failed to load transcript." },
                ];
                return next;
              });
            })
            .finally(() => {
              setCount((prev) => prev + 1);
            });
        });
      })
      .catch(() => {
        setPlaylistResult({ message: "Something went wrong. Please try again." });
        setPlaylistLoading(false);
      });
  }

  function handlePlaylistSubmit(e) {
    e?.preventDefault();
    fetchPlaylist();
  }

  const totalVideos = playlistResult?.videoIds?.length || 0;

  return (
    <div
      className="w-full max-w-[640px]"
      style={{ animation: "fadeUp 0.3s ease-out" }}
    >
      {/* Input */}
      <form onSubmit={handlePlaylistSubmit}>
        <div
          className="foreground transition-all duration-200"
          style={{
            borderRadius: 14,
            padding: 6,
            border: inputFocused
              ? "1.5px solid var(--accent)"
              : "1.5px solid var(--border-default)",
            boxShadow: inputFocused
              ? "0 0 0 3px rgba(232, 139, 90, 0.12)"
              : "none",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center ml-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9" />
                <path d="m9 10 3 2 3-2" />
                <rect x="2" y="15" width="20" height="4" rx="1" />
              </svg>
            </div>

            <input
              type="text"
              placeholder="Paste a YouTube playlist URL…"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
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
              disabled={!playlistUrl.trim() || playlistLoading}
              className="accent-bg flex-shrink-0 w-[42px] h-[42px] flex items-center justify-center mr-0.5"
              style={{
                borderRadius: 12,
                border: "none",
                opacity:
                  !playlistUrl.trim() || playlistLoading ? 0.35 : 1,
                cursor:
                  !playlistUrl.trim() || playlistLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {playlistLoading ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading state */}
      {playlistLoading && !playlistResult && (
        <div className="mt-6" style={{ animation: "fadeUp 0.35s ease-out" }}>
          <div
            className="foreground flex flex-col items-center gap-4 py-8"
            style={{
              borderRadius: 14,
              border: "1.5px solid var(--border-default)",
            }}
          >
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
            <span
              className="deemphasize"
              style={{ fontSize: "0.875rem" }}
            >
              Loading playlist…
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {!playlistLoading &&
        playlistResult &&
        playlistResult.message != null && (
          <div
            className="mt-6"
            style={{ animation: "fadeUp 0.35s ease-out" }}
          >
            <div
              className="foreground px-5 py-6"
              style={{
                borderRadius: 14,
                border: "1.5px solid var(--border-default)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  {playlistResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Results */}
      {!playlistLoading &&
        playlistResult &&
        playlistResult.message == null && (
          <div
            className="mt-6"
            style={{ animation: "fadeUp 0.35s ease-out" }}
          >
            {/* Progress bar */}
            {totalVideos > 0 && count < totalVideos && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="deemphasize"
                    style={{ fontSize: "0.8rem" }}
                  >
                    Fetching transcripts…
                  </span>
                  <span
                    className="deemphasize"
                    style={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}
                  >
                    {count}/{totalVideos}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--border-default)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(count / totalVideos) * 100}%`,
                      background: "var(--accent)",
                      borderRadius: 2,
                      transition: "width 0.3s ease-out",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Done badge */}
            {totalVideos > 0 && count >= totalVideos && (
              <div className="flex items-center gap-2 mb-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span
                  className="deemphasize"
                  style={{ fontSize: "0.8rem" }}
                >
                  All {totalVideos} transcripts fetched
                </span>
              </div>
            )}

            <div
              className="foreground overflow-hidden"
              style={{
                borderRadius: 14,
                border: "1.5px solid var(--border-default)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: "1px solid var(--border-default)",
                }}
              >
                <span
                  className="deemphasize bold"
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Playlist Results
                </span>
                <span
                  className="deemphasize"
                  style={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}
                >
                  {totalVideos} videos
                </span>
              </div>
              <div
                style={{
                  maxHeight: 480,
                  overflowY: "auto",
                }}
              >
                <GridComponent
                  count={count}
                  setCount={setCount}
                  data={videoTranscriptPairs}
                />
              </div>
            </div>
          </div>
        )}

      {/* Footer hint */}
      {!playlistLoading && !playlistResult && (
        <p
          className="deemphasize mt-5 text-center pb-8"
          style={{ fontSize: "0.78rem" }}
        >
          Press{" "}
          <span
            className="foreforeground"
            style={{
              fontSize: "0.7rem",
              border: "1px solid var(--border-default)",
              borderRadius: 5,
              padding: "2px 7px",
              margin: "0 2px",
            }}
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
