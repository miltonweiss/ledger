'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CONTEXT_MODES,
  DEFAULT_SETTINGS,
  PROVIDERS,
  loadChatSettings,
  saveChatSettings,
} from '@/lib/chat-settings'

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.72 7.72 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
}

export default function ChatSettingsPanel({ settings, onChange }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function update(partial) {
    const next = { ...settings, ...partial }
    saveChatSettings(next)
    onChange(next)
  }

  function handleProviderChange(provider) {
    const model = PROVIDERS[provider]?.models[0] ?? DEFAULT_SETTINGS.model
    update({ provider, model })
  }

  const models = PROVIDERS[settings.provider]?.models ?? PROVIDERS.openai.models

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 btn foreforeforeground opacityHover"
        aria-label="Chat settings"
        aria-expanded={open}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 foreground borderDefault rounded-xl p-3 shadow-lg flex flex-col gap-3 min-w-[220px]"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-60">Provider</span>
            <select
              value={settings.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="focus-input py-1 text-sm w-full cursor-pointer appearance-none bg-no-repeat"
              style={selectStyle}
            >
              {Object.entries(PROVIDERS).map(([id, { label }]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-60">Model</span>
            <select
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
              className="focus-input py-1 text-sm w-full cursor-pointer appearance-none bg-no-repeat"
              style={selectStyle}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-60">Context</span>
            <select
              value={settings.contextMode}
              onChange={(e) => update({ contextMode: e.target.value })}
              className="focus-input py-1 text-sm w-full cursor-pointer appearance-none bg-no-repeat"
              style={selectStyle}
            >
              {Object.entries(CONTEXT_MODES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-60 flex justify-between">
              <span>Temperature</span>
              <span>{settings.temperature.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => update({ temperature: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </div>
  )
}

export function useChatSettings() {
  const [settings, setSettings] = useState(() => loadChatSettings())

  return [settings, setSettings]
}
