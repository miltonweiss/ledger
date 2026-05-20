export const CHAT_SETTINGS_KEY = 'ledger-chat-settings'

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-5.5', 'gpt-5.4-pro', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'],
  },
  mistral: {
    label: 'Mistral',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'ministral-3b-latest',
      'ministral-8b-latest',
      'open-mistral-7b',
      'open-mixtral-8x7b',
      'open-mixtral-8x22b',
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
}

export const CONTEXT_MODES = {
  auto: 'Auto',
  fast: 'Fast',
  sources: 'Sources',
  focus: 'Focus OS',
  full: 'Full',
}

export const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: 'gpt-5.5',
  temperature: 0.35,
  contextMode: 'auto',
}

export function loadChatSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }

  try {
    const raw = localStorage.getItem(CHAT_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }

    const parsed = JSON.parse(raw)
    const provider = PROVIDERS[parsed.provider] ? parsed.provider : DEFAULT_SETTINGS.provider
    const models = PROVIDERS[provider].models
    const model = models.includes(parsed.model) ? parsed.model : models[0]
    const temperature =
      typeof parsed.temperature === 'number' && parsed.temperature >= 0 && parsed.temperature <= 2
        ? parsed.temperature
        : DEFAULT_SETTINGS.temperature
    const contextMode = CONTEXT_MODES[parsed.contextMode]
      ? parsed.contextMode
      : DEFAULT_SETTINGS.contextMode

    return { provider, model, temperature, contextMode }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveChatSettings(settings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings))
}
