import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Brain,
  Key,
  X,
} from '@phosphor-icons/react'
import { type BookAgentClientConfig } from '../../client-config'
import {
  createClearedUserMemory,
  createDefaultUserMemory,
  createSimpleEditedUserMemory,
  type UserMemoryView,
} from '../../memory-data'
import {
  clearUserMemory,
  saveUserMemory,
} from '../../memory-store'
import { createSettingsClientConfig } from '../../settings-config'

type SettingsTab = 'api' | 'memory'

type SettingsModalProps = {
  config: BookAgentClientConfig
  userMemory: UserMemoryView
  onChange: (config: BookAgentClientConfig) => void
  onMemoryChange: (memory: UserMemoryView) => void
  onClose: () => void
}

export const SettingsModal = ({
  config,
  userMemory,
  onChange,
  onMemoryChange,
  onClose,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api')
  const [apiKey, setApiKey] = useState(config.openrouter.apiKey)
  const [wechatApiKey, setWechatApiKey] = useState(config.wechatApiKey)
  const [memoryEnabled, setMemoryEnabled] = useState(config.memory.enabled)
  const [autoGenerateFromPrompt, setAutoGenerateFromPrompt] = useState(
    config.memory.autoGenerateFromPrompt,
  )
  const [profileSummary, setProfileSummary] = useState(userMemory.profile.summary)
  const [memoryStatus, setMemoryStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const nextConfig = (): BookAgentClientConfig => ({
    ...createSettingsClientConfig(config, apiKey, wechatApiKey),
    memory: {
      enabled: memoryEnabled,
      includeInRecommendations: memoryEnabled,
      autoGenerateFromPrompt,
    },
  })

  const applyMemory = (memory: UserMemoryView) => {
    setProfileSummary(memory.profile.summary)
    onMemoryChange(memory)
  }

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value)
  }

  const handleWechatApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setWechatApiKey(event.target.value)
  }

  const handleClearMemory = async () => {
    setMemoryStatus('')
    setIsSaving(true)

    try {
      await clearUserMemory()
      const clearedMemory = createClearedUserMemory()
      const clearedConfig = {
        ...nextConfig(),
        preferences: {
          favoriteCategories: [],
        },
      }

      onChange(clearedConfig)
      applyMemory(clearedMemory)
      setMemoryStatus('记忆已清空。')
    } catch (error) {
      applyMemory(createDefaultUserMemory())
      setMemoryStatus(formatError(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    const memory = createSimpleEditedUserMemory(userMemory, profileSummary)

    void saveUserMemory(memory)
      .then((savedMemory) => {
        onChange(nextConfig())
        onMemoryChange(savedMemory)
        onClose()
      })
      .catch((error) => {
        setMemoryStatus(formatError(error))
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <div
      className="settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onClick={onClose}
    >
      <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          aria-label="关闭设置"
          title="关闭"
          onClick={onClose}
          className="settings-close"
        >
          <X size={18} />
        </button>

        <aside className="settings-nav">
          <p className="settings-nav-title">设置</p>
          <button
            type="button"
            className={`settings-nav-item ${
              activeTab === 'api' ? 'settings-nav-item-active' : ''
            }`}
            onClick={() => setActiveTab('api')}
          >
            <Key size={16} weight="bold" />
            <span>API Key</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item ${
              activeTab === 'memory' ? 'settings-nav-item-active' : ''
            }`}
            onClick={() => setActiveTab('memory')}
          >
            <Brain size={16} weight="bold" />
            <span>记忆</span>
          </button>
        </aside>

        <form className="settings-content" onSubmit={handleSubmit}>
          {activeTab === 'api' ? (
            <ApiSettings
              apiKey={apiKey}
              wechatApiKey={wechatApiKey}
              onApiKeyChange={handleApiKeyChange}
              onWechatApiKeyChange={handleWechatApiKeyChange}
            />
          ) : (
            <MemorySettingsPanel
              memoryEnabled={memoryEnabled}
              autoGenerateFromPrompt={autoGenerateFromPrompt}
              profileSummary={profileSummary}
              memoryStatus={memoryStatus}
              isSaving={isSaving}
              onMemoryEnabledChange={setMemoryEnabled}
              onAutoGenerateFromPromptChange={setAutoGenerateFromPrompt}
              onProfileSummaryChange={setProfileSummary}
              onClearMemory={handleClearMemory}
            />
          )}

          <div className="settings-actions">
            <button type="button" onClick={onClose} className="secondary-button">
              取消
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type ApiSettingsProps = {
  apiKey: string
  wechatApiKey: string
  onApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void
  onWechatApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const ApiSettings = ({
  apiKey,
  wechatApiKey,
  onApiKeyChange,
  onWechatApiKeyChange,
}: ApiSettingsProps) => (
  <>
    <header className="settings-content-header">
      <h2 className="settings-content-title">API Key</h2>
      <p className="settings-content-subtitle">
        配置 OpenRouter 和微信读书 API Key。
      </p>
    </header>

    <section className="settings-section">
      <label className="config-label">
        OpenRouter API Key
        <input
          type="password"
          value={apiKey}
          onChange={onApiKeyChange}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-..."
          className="config-input"
          autoFocus
        />
      </label>
      <p className="settings-hint">
        密钥仅保存在本地。
      </p>
    </section>

    <section className="settings-section">
      <label className="config-label">
        微信读书 API Key
        <input
          type="password"
          value={wechatApiKey}
          onChange={onWechatApiKeyChange}
          autoComplete="off"
          spellCheck={false}
          placeholder="输入微信读书 API Key"
          className="config-input"
        />
      </label>
      <p className="settings-hint">
        获取链接：
        <a
          href="https://weread.qq.com/r/weread-skills"
          target="_blank"
          rel="noreferrer"
          className="settings-link"
        >
          https://weread.qq.com/r/weread-skills
        </a>
      </p>
    </section>
  </>
)

type MemorySettingsPanelProps = {
  memoryEnabled: boolean
  autoGenerateFromPrompt: boolean
  profileSummary: string
  memoryStatus: string
  isSaving: boolean
  onMemoryEnabledChange: (value: boolean) => void
  onAutoGenerateFromPromptChange: (value: boolean) => void
  onProfileSummaryChange: (value: string) => void
  onClearMemory: () => void
}

const MemorySettingsPanel = ({
  memoryEnabled,
  autoGenerateFromPrompt,
  profileSummary,
  memoryStatus,
  isSaving,
  onMemoryEnabledChange,
  onAutoGenerateFromPromptChange,
  onProfileSummaryChange,
  onClearMemory,
}: MemorySettingsPanelProps) => (
  <>
    <header className="settings-content-header">
      <h2 className="settings-content-title">记忆</h2>
    </header>

    <section className="settings-section memory-simple-controls">
      <ToggleField
        label="启用记忆"
        checked={memoryEnabled}
        onChange={onMemoryEnabledChange}
      />
      <ToggleField
        label="自动学习"
        checked={autoGenerateFromPrompt}
        onChange={onAutoGenerateFromPromptChange}
      />
    </section>

    <section className="settings-section">
      <label className="config-label">
        记忆摘要
        <textarea
          value={profileSummary}
          onChange={(event) => onProfileSummaryChange(event.target.value)}
          className="config-input config-textarea memory-summary-textarea"
          rows={7}
        />
      </label>
    </section>

    <section className="settings-section">
      <div className="settings-inline-actions">
        <button
          type="button"
          className="secondary-button danger-button"
          disabled={isSaving}
          onClick={onClearMemory}
        >
          清空记忆
        </button>
      </div>
      {memoryStatus ? <p className="settings-hint">{memoryStatus}</p> : null}
    </section>
  </>
)

type ToggleFieldProps = {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

const ToggleField = ({ label, checked, onChange }: ToggleFieldProps) => (
  <label className="settings-toggle">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span>{label}</span>
  </label>
)

const formatError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '记忆操作失败。'
