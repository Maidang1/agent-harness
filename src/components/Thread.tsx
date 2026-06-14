import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpenText,
  CheckCircle,
  CircleNotch,
  GearSix,
  PaperPlaneRight,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import {
  type BookAgentClientConfig,
  type OpenRouterClientConfig,
} from '../client-config'

type ThreadProps = {
  clientConfig: BookAgentClientConfig
  onClientConfigChange: (config: BookAgentClientConfig) => void
  isOpenRouterConfigured: boolean
  isWechatConfigured: boolean
}

export const Thread = ({
  clientConfig,
  onClientConfigChange,
  isOpenRouterConfigured,
  isWechatConfigured,
}: ThreadProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(
    () => !isOpenRouterConfigured,
  )

  return (
    <ThreadPrimitive.Root className="flex h-screen flex-col bg-[var(--page-bg)]">
      {/* Header */}
      <header className="relative flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-8 sm:py-5">
        <span className="flex size-9 items-center justify-center rounded-md bg-[var(--brand-tint)] text-[var(--brand)] sm:size-10">
          <BookOpenText size={24} weight="duotone" />
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-semibold text-[var(--ink)] sm:text-2xl">
            读书推荐 Agent
          </h1>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            为你的阅读，找到一本合适的书
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ConfigStatus
            label="OpenRouter"
            isConfigured={isOpenRouterConfigured}
          />
          <ConfigStatus label="微信" isConfigured={isWechatConfigured} />
          <button
            type="button"
            aria-label="客户端配置"
            title="客户端配置"
            onClick={() => setIsConfigOpen((current) => !current)}
            className="flex size-9 items-center justify-center rounded-md border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-soft)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <GearSix size={19} />
          </button>
        </div>
        {isConfigOpen ? (
          <ClientConfigPanel
            config={clientConfig}
            onChange={onClientConfigChange}
            onClose={() => setIsConfigOpen(false)}
          />
        ) : null}
      </header>

      {/* Messages */}
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
        <ThreadPrimitive.Empty>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <BookOpenText
              className="text-[var(--brand)]"
              size={48}
              weight="duotone"
            />
            <h2 className="mt-4 font-serif text-2xl font-semibold text-[var(--ink)]">
              说说你的阅读需求
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              描述你的兴趣、困惑、目标或想解决的问题，越具体越好。
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      {/* Composer */}
      <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-4 sm:px-8 sm:py-5">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  )
}

type ConfigStatusProps = {
  label: string
  isConfigured: boolean
}

const ConfigStatus = ({ label, isConfigured }: ConfigStatusProps) => (
  <span
    className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
      isConfigured
        ? 'border-[rgba(27,93,61,0.18)] bg-[rgba(27,93,61,0.08)] text-[#1b5d3d]'
        : 'border-[rgba(181,51,51,0.18)] bg-[rgba(181,51,51,0.08)] text-[var(--error)]'
    }`}
  >
    {isConfigured ? (
      <CheckCircle size={15} weight="fill" />
    ) : (
      <WarningCircle size={15} weight="fill" />
    )}
    {label}
  </span>
)

type ClientConfigPanelProps = {
  config: BookAgentClientConfig
  onChange: (config: BookAgentClientConfig) => void
  onClose: () => void
}

const ClientConfigPanel = ({
  config,
  onChange,
  onClose,
}: ClientConfigPanelProps) => {
  const [draftConfig, setDraftConfig] = useState(config)

  const updateOpenRouterDraftConfig =
    (field: keyof OpenRouterClientConfig) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraftConfig((current) => ({
        ...current,
        openrouter: {
          ...current.openrouter,
          [field]: event.target.value,
        },
      }))
    }

  const updateWechatApiKey = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftConfig((current) => ({
      ...current,
      wechatApiKey: event.target.value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onChange({
      openrouter: {
        apiKey: draftConfig.openrouter.apiKey.trim(),
        model: draftConfig.openrouter.model.trim(),
        baseUrl: draftConfig.openrouter.baseUrl.trim(),
      },
      wechatApiKey: draftConfig.wechatApiKey.trim(),
    })
    onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute right-4 top-[calc(100%+0.5rem)] z-20 w-[calc(100vw-2rem)] max-w-lg rounded-lg border border-[var(--line)] bg-[var(--paper)] p-4 shadow-[0_18px_48px_rgba(20,20,19,0.14)] sm:right-8 sm:w-[32rem]"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          客户端配置
        </h2>
        <button
          type="button"
          aria-label="关闭配置"
          title="关闭配置"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--brand-tint)] hover:text-[var(--brand)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4">
        <section className="grid gap-3">
          <h3 className="text-xs font-semibold text-[var(--muted)]">
            OpenRouter
          </h3>
          <label className="grid gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
            API Key
            <input
              type="password"
              value={draftConfig.openrouter.apiKey}
              onChange={updateOpenRouterDraftConfig('apiKey')}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-or-..."
              className="h-10 rounded-md border border-[var(--line-strong)] bg-[var(--page-bg)] px-3 text-sm font-normal text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-light)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)]"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
            模型
            <input
              type="text"
              value={draftConfig.openrouter.model}
              onChange={updateOpenRouterDraftConfig('model')}
              spellCheck={false}
              className="h-10 rounded-md border border-[var(--line-strong)] bg-[var(--page-bg)] px-3 text-sm font-normal text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)]"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
            接口地址
            <input
              type="url"
              value={draftConfig.openrouter.baseUrl}
              onChange={updateOpenRouterDraftConfig('baseUrl')}
              spellCheck={false}
              className="h-10 rounded-md border border-[var(--line-strong)] bg-[var(--page-bg)] px-3 text-sm font-normal text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)]"
            />
          </label>
        </section>

        <section className="grid gap-3 border-t border-[var(--line)] pt-4">
          <h3 className="text-xs font-semibold text-[var(--muted)]">微信</h3>
          <label className="grid gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
            API Key
            <input
              type="password"
              value={draftConfig.wechatApiKey}
              onChange={updateWechatApiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="微信 API Key"
              className="h-10 rounded-md border border-[var(--line-strong)] bg-[var(--page-bg)] px-3 text-sm font-normal text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-light)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)]"
            />
          </label>
        </section>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-md border border-[var(--line-strong)] px-3 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          取消
        </button>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--brand)] px-3 text-sm font-medium text-white transition hover:bg-[var(--brand-strong)]"
        >
          <CheckCircle size={17} weight="fill" />
          保存配置
        </button>
      </div>
    </form>
  )
}

const UserMessage = () => (
  <MessagePrimitive.Root className="mb-4 flex justify-end">
    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--brand)] px-4 py-3 text-sm leading-7 text-white sm:text-base">
      <MessagePrimitive.Content />
    </div>
  </MessagePrimitive.Root>
)

const MarkdownText = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="markdown-content"
  />
)

const AssistantMessage = () => (
  <MessagePrimitive.Root className="mb-4 flex justify-start">
    <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
        }}
      />
    </div>
  </MessagePrimitive.Root>
)

const Composer = () => (
  <ComposerPrimitive.Root className="flex items-end gap-3">
    <ComposerPrimitive.Input
      placeholder="描述你的阅读需求，比如：最近工作压力大，想通过阅读调整心态..."
      className="flex-1 resize-none rounded-xl border border-[var(--line-strong)] bg-[var(--page-bg)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-light)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(27,54,93,0.12)] sm:text-base sm:leading-7"
      autoFocus
    />
    <ComposerPrimitive.Send className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:bg-[var(--line-strong)] disabled:text-[var(--muted-light)]">
      <SendIcon />
    </ComposerPrimitive.Send>
  </ComposerPrimitive.Root>
)

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <CircleNotch size={20} className="animate-spin" />
  ) : (
    <PaperPlaneRight size={20} weight="fill" />
  )
}
