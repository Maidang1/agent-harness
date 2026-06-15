import {
  DEFAULT_CODEX_PATH,
  DEFAULT_CODEX_SANDBOX,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type BookAgentProvider,
  type BookAgentClientConfig,
  type CodexClientConfig,
} from './client-config.ts'

export type SettingsClientConfigInput = {
  provider: BookAgentProvider
  openrouterApiKey: string
  wechatApiKey: string
  codex: CodexClientConfig
}

export const createSettingsClientConfig = (
  config: BookAgentClientConfig,
  input: SettingsClientConfigInput,
): BookAgentClientConfig => ({
  ...config,
  provider: input.provider,
  openrouter: {
    apiKey: input.openrouterApiKey.trim(),
    model: config.openrouter.model.trim() || DEFAULT_OPENROUTER_MODEL,
    baseUrl: config.openrouter.baseUrl.trim() || DEFAULT_OPENROUTER_BASE_URL,
  },
  codex: {
    model: input.codex.model.trim(),
    codexPath: input.codex.codexPath.trim() || DEFAULT_CODEX_PATH,
    cwd: input.codex.cwd.trim(),
    sandbox:
      input.codex.sandbox === 'read-only'
        ? input.codex.sandbox
        : DEFAULT_CODEX_SANDBOX,
  },
  wechatApiKey: input.wechatApiKey.trim(),
})
