import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Key, X } from '@phosphor-icons/react'
import { type BookAgentClientConfig } from '../../client-config'
import { createSettingsClientConfig } from '../../settings-config'

type SettingsModalProps = {
  config: BookAgentClientConfig
  onChange: (config: BookAgentClientConfig) => void
  onClose: () => void
}

export const SettingsModal = ({
  config,
  onChange,
  onClose,
}: SettingsModalProps) => {
  const [apiKey, setApiKey] = useState(config.openrouter.apiKey)

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onChange(createSettingsClientConfig(config, apiKey))
    onClose()
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
          <button type="button" className="settings-nav-item settings-nav-item-active">
            <Key size={16} weight="bold" />
            <span>API Key</span>
          </button>
        </aside>

        <form className="settings-content" onSubmit={handleSubmit}>
          <header className="settings-content-header">
            <h2 className="settings-content-title">API Key</h2>
            <p className="settings-content-subtitle">
              配置 OpenRouter API Key 以启用读书推荐。
            </p>
          </header>

          <section className="settings-section">
            <label className="config-label">
              OpenRouter API Key
              <input
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-or-..."
                className="config-input"
                autoFocus
              />
            </label>
            <p className="settings-hint">
              密钥仅保存在本地，不会上传到任何服务器。
            </p>
          </section>

          <div className="settings-actions">
            <button type="button" onClick={onClose} className="secondary-button">
              取消
            </button>
            <button type="submit" className="primary-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
