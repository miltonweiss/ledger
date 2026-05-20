export const CHAT_SETTINGS_KEY = 'ledger-chat-settings'

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
  deepseek: {
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
}

export const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: 'gpt-4.1',
  temperature: 0.35,
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

    return { provider, model, temperature }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveChatSettings(settings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings))
}
