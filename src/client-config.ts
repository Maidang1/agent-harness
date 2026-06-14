export type OpenRouterClientConfig = {
  apiKey: string
  model: string
  baseUrl: string
}

export const BOOK_PREFERENCE_CATEGORIES = [
  { value: '文学小说', label: '文学小说' },
  { value: '商业管理', label: '商业管理' },
  { value: '心理成长', label: '心理成长' },
  { value: '历史社科', label: '历史社科' },
  { value: '科技科普', label: '科技科普' },
  { value: '传记纪实', label: '传记纪实' },
] as const

export type BookPreferenceCategory =
  (typeof BOOK_PREFERENCE_CATEGORIES)[number]['value']

export type BookUserPreferences = {
  favoriteCategories: BookPreferenceCategory[]
}

export type BookAgentClientConfig = {
  openrouter: OpenRouterClientConfig
  wechatApiKey: string
  preferences: BookUserPreferences
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
  preferences: {
    favoriteCategories: [],
  },
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
      preferences: normalizePreferences(parsedConfig.preferences),
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

const normalizePreferences = (value: unknown): BookUserPreferences => {
  if (typeof value !== 'object' || value === null) {
    return { favoriteCategories: [] }
  }

  return {
    favoriteCategories: normalizeFavoriteCategories(
      (value as Partial<BookUserPreferences>).favoriteCategories,
    ),
  }
}

const normalizeFavoriteCategories = (value: unknown): BookPreferenceCategory[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const categories = new Set<BookPreferenceCategory>()

  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }

    const category = item.trim()

    if (isBookPreferenceCategory(category)) {
      categories.add(category)
    }
  }

  return [...categories]
}

const isBookPreferenceCategory = (
  value: string,
): value is BookPreferenceCategory =>
  BOOK_PREFERENCE_CATEGORIES.some((category) => category.value === value)
