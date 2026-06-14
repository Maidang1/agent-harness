import {
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type BookAgentClientConfig,
} from './client-config.ts'

export const createSettingsClientConfig = (
  config: BookAgentClientConfig,
  apiKey: string,
): BookAgentClientConfig => ({
  ...config,
  openrouter: {
    apiKey: apiKey.trim(),
    model: config.openrouter.model.trim() || DEFAULT_OPENROUTER_MODEL,
    baseUrl: config.openrouter.baseUrl.trim() || DEFAULT_OPENROUTER_BASE_URL,
  },
})
