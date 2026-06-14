export type OpenRouterClientConfig = {
  apiKey: string
  model: string
  baseUrl: string
}

export type BookAgentClientConfig = {
  openrouter: OpenRouterClientConfig
  wechatApiKey: string
}

export const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash'
export const DEFAULT_OPENROUTER_BASE_URL =
  'https://openrouter.ai/api/v1/chat/completions'

const STORAGE_KEY = 'book-agent.client-config'
const LEGACY_OPENROUTER_STORAGE_KEY = 'book-agent.openrouter-config'

export const createDefaultClientConfig = (): BookAgentClientConfig => ({
  openrouter: {
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODEL,
    baseUrl: DEFAULT_OPENROUTER_BASE_URL,
  },
  wechatApiKey: '',
})

export const loadClientConfig = (): BookAgentClientConfig => {
  const defaults = createDefaultClientConfig()

  try {
    const storedConfig =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_OPENROUTER_STORAGE_KEY)

    if (!storedConfig) {
      return defaults
    }

    const parsedConfig = JSON.parse(storedConfig) as Partial<
      BookAgentClientConfig & OpenRouterClientConfig
    >
    const openrouterConfig = parsedConfig.openrouter ?? parsedConfig

    return {
      openrouter: {
        apiKey: stringValue(openrouterConfig.apiKey, ''),
        model: stringValue(openrouterConfig.model, DEFAULT_OPENROUTER_MODEL),
        baseUrl: stringValue(openrouterConfig.baseUrl, DEFAULT_OPENROUTER_BASE_URL),
      },
      wechatApiKey: stringValue(parsedConfig.wechatApiKey, ''),
    }
  } catch {
    return defaults
  }
}

export const saveClientConfig = (config: BookAgentClientConfig) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const hasOpenRouterApiKey = (config: BookAgentClientConfig) =>
  config.openrouter.apiKey.trim().length > 0

export const hasWechatApiKey = (config: BookAgentClientConfig) =>
  config.wechatApiKey.trim().length > 0

const stringValue = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmedValue = value.trim()
  return trimmedValue || fallback
}
