"use client";
import { useState } from "react";
import TranscriptPageContent from "@/app/components/youtube/TranscriptPageContent";
import PlaylistPageContent from "@/app/components/youtube/PlaylistPageContent";

const TABS = [
  { key: "single", label: "Single Video" },
  { key: "playlist", label: "Playlist" },
  
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("single");

  return (
    <div className="background flex flex-col min-h-screen items-center px-5">
      {/* Hero */}
      <div className="flex flex-col items-center pt-[min(14vh,120px)] pb-6 w-full max-w-[640px]">
        <div
          className="accent-bg w-12 h-12 flex items-center justify-center mb-7"
          style={{ borderRadius: 14 }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <h4 className="text-center mb-2">YouTube Transcript</h4>
        <p
          className="deemphasize text-center"
          style={{ fontSize: "0.95rem" }}
        >
          Extract transcripts from videos, playlists, or channels.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="w-full max-w-[640px] mb-6">
        <div
          className="foreground flex p-1 gap-1"
          style={{
            borderRadius: 12,
            border: "1.5px solid var(--border-default)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 transition-all duration-200"
              style={{
                borderRadius: 9,
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                background:
                  activeTab === tab.key
                    ? "var(--accent)"
                    : "transparent",
                color:
                  activeTab === tab.key
                    ? "#fff"
                    : "var(--text-muted)",
                boxShadow:
                  activeTab === tab.key
                    ? "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Single Video Tab */}
      {activeTab === "single" && <TranscriptPageContent />}

      {/* Playlist Tab */}
      {activeTab === "playlist" && <PlaylistPageContent />}

      

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