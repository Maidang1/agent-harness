export type OpenRouterClientConfig = {
  apiKey: string
  model: string
  baseUrl: string
}

export type BookAgentProvider = 'openrouter' | 'codex'

export type CodexSandboxMode = 'read-only'

export type CodexClientConfig = {
  model: string
  codexPath: string
  cwd: string
  sandbox: CodexSandboxMode
}

export const BOOK_PERSONA_PRESETS = [
  {
    id: 'professional',
    label: '专业顾问',
    prompt:
      '你是专业的读书顾问。回复清晰、克制、结构紧凑，优先给出高质量书单、具体推荐理由和可执行阅读建议。',
  },
  {
    id: 'concise',
    label: '简洁直给',
    prompt:
      '你用简洁直给的语气回答。先给结论，再给必要理由，少铺垫，避免泛泛而谈。',
  },
  {
    id: 'warm',
    label: '温和陪伴',
    prompt:
      '你像耐心的读书陪伴者一样回答。语气温和、具体、低压力，帮助用户更容易开始阅读并持续读下去。',
  },
  {
    id: 'criticalCoach',
    label: '批判教练',
    prompt:
      '你像严格的读书教练一样回答。直接指出选择依据、取舍和潜在误区，给出更优读法和下一步行动。',
  },
] as const

export type BookPersonaPresetId = (typeof BOOK_PERSONA_PRESETS)[number]['id']

export type BookPersonaConfig = {
  presetId: BookPersonaPresetId
  customPrompt: string
  useCustomPrompt: boolean
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

export type BookMemorySettings = {
  enabled: boolean
  includeInRecommendations: boolean
  autoGenerateFromPrompt: boolean
}

export type BookAgentClientConfig = {
  provider: BookAgentProvider
  openrouter: OpenRouterClientConfig
  codex: CodexClientConfig
  wechatApiKey: string
  preferences: BookUserPreferences
  memory: BookMemorySettings
  persona: BookPersonaConfig
}

export const DEFAULT_BOOK_PERSONA_PRESET_ID: BookPersonaPresetId = 'professional'
export const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash'
export const DEFAULT_OPENROUTER_BASE_URL =
  'https://openrouter.ai/api/v1/chat/completions'
export const DEFAULT_CODEX_PATH = 'codex'
export const DEFAULT_CODEX_CWD = ''
export const DEFAULT_CODEX_SANDBOX: CodexSandboxMode = 'read-only'

export const OPENROUTER_MODEL_OPTIONS = [
  {
    id: DEFAULT_OPENROUTER_MODEL,
    label: 'DeepSeek V4 Flash',
  },
  {
    id: 'qwen/qwen3.5-flash-02-23',
    label: 'Qwen 3.5 Flash',
  },
  {
    id: 'xiaomi/mimo-v2.5',
    label: 'MiMo v2.5',
  },
] as const

const STORAGE_KEY = 'book-agent.client-config'
const LEGACY_OPENROUTER_STORAGE_KEY = 'book-agent.openrouter-config'

export const createDefaultClientConfig = (): BookAgentClientConfig => ({
  provider: 'openrouter',
  openrouter: {
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODEL,
    baseUrl: DEFAULT_OPENROUTER_BASE_URL,
  },
  codex: {
    model: '',
    codexPath: DEFAULT_CODEX_PATH,
    cwd: DEFAULT_CODEX_CWD,
    sandbox: DEFAULT_CODEX_SANDBOX,
  },
  wechatApiKey: '',
  preferences: {
    favoriteCategories: [],
  },
  memory: {
    enabled: true,
    includeInRecommendations: true,
    autoGenerateFromPrompt: true,
  },
  persona: {
    presetId: DEFAULT_BOOK_PERSONA_PRESET_ID,
    customPrompt: '',
    useCustomPrompt: false,
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
      provider: normalizeProvider(parsedConfig.provider),
      openrouter: {
        apiKey: stringValue(openrouterConfig.apiKey, ''),
        model: stringValue(openrouterConfig.model, DEFAULT_OPENROUTER_MODEL),
        baseUrl: stringValue(openrouterConfig.baseUrl, DEFAULT_OPENROUTER_BASE_URL),
      },
      codex: normalizeCodexConfig(parsedConfig.codex),
      wechatApiKey: stringValue(parsedConfig.wechatApiKey, ''),
      preferences: normalizePreferences(parsedConfig.preferences),
      memory: normalizeMemorySettings(parsedConfig.memory),
      persona: normalizePersonaConfig(parsedConfig.persona),
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

export const isBookAgentConfigured = (config: BookAgentClientConfig) =>
  config.provider === 'codex' || hasOpenRouterApiKey(config)

export const hasWechatApiKey = (config: BookAgentClientConfig) =>
  config.wechatApiKey.trim().length > 0

export const getBookPersonaPreset = (id: string) =>
  BOOK_PERSONA_PRESETS.find((preset) => preset.id === id) ??
  BOOK_PERSONA_PRESETS[0]

export const getBookPersonaPrompt = (persona: BookPersonaConfig) => {
  const customPrompt = persona.customPrompt.trim()

  if (persona.useCustomPrompt && customPrompt.length > 0) {
    return customPrompt
  }

  return getBookPersonaPreset(persona.presetId).prompt
}

const stringValue = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmedValue = value.trim()
  return trimmedValue || fallback
}

const plainStringValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const normalizeProvider = (value: unknown): BookAgentProvider =>
  value === 'codex' ? 'codex' : 'openrouter'

const normalizeCodexConfig = (value: unknown): CodexClientConfig => {
  const defaults = createDefaultClientConfig().codex

  if (typeof value !== 'object' || value === null) {
    return defaults
  }

  const settings = value as Partial<CodexClientConfig>

  return {
    model: plainStringValue(settings.model),
    codexPath: stringValue(settings.codexPath, DEFAULT_CODEX_PATH),
    cwd: plainStringValue(settings.cwd),
    sandbox: settings.sandbox === 'read-only' ? 'read-only' : DEFAULT_CODEX_SANDBOX,
  }
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

export const isBookPersonaPresetId = (
  value: string,
): value is BookPersonaPresetId =>
  BOOK_PERSONA_PRESETS.some((preset) => preset.id === value)

const normalizePersonaConfig = (value: unknown): BookPersonaConfig => {
  const defaults = createDefaultClientConfig().persona

  if (typeof value !== 'object' || value === null) {
    return defaults
  }

  const settings = value as Partial<BookPersonaConfig>
  const presetId = normalizePersonaPresetId(settings.presetId)

  return {
    presetId,
    customPrompt: plainStringValue(settings.customPrompt),
    useCustomPrompt: booleanValue(
      settings.useCustomPrompt,
      defaults.useCustomPrompt,
    ),
  }
}

const normalizePersonaPresetId = (value: unknown): BookPersonaPresetId => {
  if (typeof value !== 'string') {
    return DEFAULT_BOOK_PERSONA_PRESET_ID
  }

  const presetId = value.trim()
  return isBookPersonaPresetId(presetId) ? presetId : DEFAULT_BOOK_PERSONA_PRESET_ID
}

const normalizeMemorySettings = (value: unknown): BookMemorySettings => {
  const defaults = createDefaultClientConfig().memory

  if (typeof value !== 'object' || value === null) {
    return defaults
  }

  const settings = value as Partial<BookMemorySettings>

  return {
    enabled: booleanValue(settings.enabled, defaults.enabled),
    includeInRecommendations: booleanValue(
      settings.includeInRecommendations,
      defaults.includeInRecommendations,
    ),
    autoGenerateFromPrompt: booleanValue(
      settings.autoGenerateFromPrompt,
      defaults.autoGenerateFromPrompt,
    ),
  }
}

const booleanValue = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback
