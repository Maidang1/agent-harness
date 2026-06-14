import { useState } from 'react'
import {
  ComposerPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { ArrowUp, CircleNotch, Plus } from '@phosphor-icons/react'

const preferenceChips = ['低压力', '短篇', '睡前', '治愈']

export const Composer = () => {
  const [selectedPreferences, setSelectedPreferences] = useState(['低压力', '睡前'])

  const togglePreference = (preference: string) => {
    setSelectedPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    )
  }

  return (
    <div className="composer-shell">
      <div className="preference-strip" aria-label="阅读偏好">
        {preferenceChips.map((preference) => (
          <button
            key={preference}
            type="button"
            className={`preference-chip ${
              selectedPreferences.includes(preference) ? 'preference-chip-active' : ''
            }`}
            onClick={() => togglePreference(preference)}
          >
            {preference}
          </button>
        ))}
        <button type="button" className="preference-add">
          <Plus size={16} weight="bold" />
          添加偏好
        </button>
      </div>

      <ComposerPrimitive.Root className="composer-root">
        <div className="composer-main-row">
          <button type="button" className="composer-tool" aria-label="添加内容">
            <Plus size={21} weight="bold" />
          </button>
          <ComposerPrimitive.Input
            id="book-agent-composer"
            name="message"
            placeholder="继续提问，或输入 / 选择功能"
            className="composer-input"
            autoFocus
          />
          <ComposerPrimitive.Send className="composer-send" aria-label="发送消息">
            <SendIcon />
          </ComposerPrimitive.Send>
        </div>
        <p className="composer-hint">按 Enter 发送，Shift + Enter 换行</p>
      </ComposerPrimitive.Root>
    </div>
  )
}

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <CircleNotch size={20} className="animate-spin" />
  ) : (
    <ArrowUp size={20} weight="bold" />
  )
}
