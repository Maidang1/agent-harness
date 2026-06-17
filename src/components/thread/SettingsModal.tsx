import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Brain,
  ChevronDown,
  Info,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  BOOK_PERSONA_PRESETS,
  getBookPersonaPreset,
  isBookPersonaPresetId,
  type BookAgentProvider,
  type BookAgentClientConfig,
  type CodexClientConfig,
  type BookPersonaPresetId,
  type BookPreferenceCategory,
} from '../../config/client-config'
import {
  getCodexAuthStatus,
  type CodexAuthStatus,
} from '../../model-clients/codex-client'
import {
  createClearedUserMemory,
  createDefaultUserMemory,
  createSimpleEditedUserMemory,
  type UserMemoryView,
} from '../../memory/memory-data'
import {
  createMemoryLearningRecord,
  hasMemoryLearningRecord,
  type MemoryLearningRecord,
} from '../../memory/memory-learning-record'
import {
  clearUserMemory,
  saveUserMemory,
} from '../../memory/memory-store'
import { createSettingsClientConfig } from '../../config/settings-config'

type SettingsTab = 'api' | 'persona' | 'memory'

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
  const [provider, setProvider] = useState<BookAgentProvider>(config.provider)
  const [apiKey, setApiKey] = useState(config.openrouter.apiKey)
  const [codexModel, setCodexModel] = useState(config.codex.model)
  const [codexPath, setCodexPath] = useState(config.codex.codexPath)
  const [codexCwd, setCodexCwd] = useState(config.codex.cwd)
  const [codexAuthStatus, setCodexAuthStatus] = useState<CodexAuthStatus>()
  const [codexStatusMessage, setCodexStatusMessage] = useState('')
  const [isCodexStatusLoading, setIsCodexStatusLoading] = useState(false)
  const [wechatApiKey, setWechatApiKey] = useState(config.wechatApiKey)
  const [personaPresetId, setPersonaPresetId] = useState(config.persona.presetId)
  const [useCustomPersona, setUseCustomPersona] = useState(
    config.persona.useCustomPrompt,
  )
  const [personaCustomPrompt, setPersonaCustomPrompt] = useState(
    config.persona.customPrompt,
  )
  const [memoryEnabled, setMemoryEnabled] = useState(config.memory.enabled)
  const [autoGenerateFromPrompt, setAutoGenerateFromPrompt] = useState(
    config.memory.autoGenerateFromPrompt,
  )
  const [profileSummary, setProfileSummary] = useState(
    userMemory.profile.userSummary || userMemory.profile.summary,
  )
  const [memoryStatus, setMemoryStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const codexConfig = (): CodexClientConfig => ({
    model: codexModel,
    codexPath,
    cwd: codexCwd,
    sandbox: 'read-only',
  })

  const nextConfig = (): BookAgentClientConfig => ({
    ...createSettingsClientConfig(config, {
      provider,
      openrouterApiKey: apiKey,
      wechatApiKey,
      codex: codexConfig(),
    }),
    memory: {
      enabled: memoryEnabled,
      includeInRecommendations: memoryEnabled,
      autoGenerateFromPrompt,
    },
    persona: {
      presetId: personaPresetId,
      customPrompt: personaCustomPrompt,
      useCustomPrompt: useCustomPersona,
    },
  })

  const refreshCodexStatus = useCallback(() => {
    setCodexStatusMessage('')
    setIsCodexStatusLoading(true)

    void getCodexAuthStatus()
      .then((status) => setCodexAuthStatus(status))
      .catch((error) => setCodexStatusMessage(formatError(error)))
      .finally(() => setIsCodexStatusLoading(false))
  }, [])

  useEffect(() => {
    let isMounted = true

    if (provider !== 'codex') {
      return () => {
        isMounted = false
      }
    }

    void getCodexAuthStatus()
      .then((status) => {
        if (isMounted) {
          setCodexAuthStatus(status)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setCodexStatusMessage(formatError(error))
        }
      })

    return () => {
      isMounted = false
    }
  }, [provider])

  const applyMemory = (memory: UserMemoryView) => {
    setProfileSummary(memory.profile.userSummary || memory.profile.summary)
    onMemoryChange(memory)
  }

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value)
  }

  const handleWechatApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setWechatApiKey(event.target.value)
  }

  const handlePersonaPresetChange = (value: string) => {
    if (isBookPersonaPresetId(value)) {
      setPersonaPresetId(value)
    }
  }

  const handleUseCustomPersonaChange = (value: boolean) => {
    setUseCustomPersona(value)

    if (value && personaCustomPrompt.trim().length === 0) {
      setPersonaCustomPrompt(getBookPersonaPreset(personaPresetId).prompt)
    }
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-h-[90dvh] gap-0 overflow-hidden border border-glass-edge bg-popover/92 p-0 shadow-[0_30px_90px_-55px_var(--glass-shadow)] backdrop-blur-2xl sm:max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[90dvh] min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-hairline bg-card/35 p-5 pr-14">
            <DialogTitle className="text-[15px] font-semibold">设置</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              配置模型访问和本地阅读记忆。
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SettingsTab)}
            className="min-h-0 flex-1 gap-0 overflow-hidden md:grid md:grid-cols-[12rem_minmax(0,1fr)]"
          >
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-hairline bg-muted/35 p-3 md:h-full md:w-auto md:flex-col md:items-stretch md:border-b-0 md:border-r md:bg-muted/28">
              <TabsTrigger value="api" className="h-9 flex-none justify-start rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
                <KeyRound data-icon="inline-start" />
                API Key
              </TabsTrigger>
              <TabsTrigger value="persona" className="h-9 flex-none justify-start rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
                <UserRound data-icon="inline-start" />
                人设
              </TabsTrigger>
              <TabsTrigger value="memory" className="h-9 flex-none justify-start rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
                <Brain data-icon="inline-start" />
                记忆
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="m-0 min-h-0 overflow-y-auto p-5">
              <ApiSettings
                provider={provider}
                apiKey={apiKey}
                codexModel={codexModel}
                codexPath={codexPath}
                codexCwd={codexCwd}
                codexAuthStatus={codexAuthStatus}
                codexStatusMessage={codexStatusMessage}
                isCodexStatusLoading={isCodexStatusLoading}
                onProviderChange={setProvider}
                wechatApiKey={wechatApiKey}
                onApiKeyChange={handleApiKeyChange}
                onCodexModelChange={setCodexModel}
                onCodexPathChange={setCodexPath}
                onCodexCwdChange={setCodexCwd}
                onRefreshCodexStatus={refreshCodexStatus}
                onWechatApiKeyChange={handleWechatApiKeyChange}
              />
            </TabsContent>

            <TabsContent value="persona" className="m-0 min-h-0 overflow-y-auto p-5">
              <PersonaSettingsPanel
                personaPresetId={personaPresetId}
                useCustomPersona={useCustomPersona}
                personaCustomPrompt={personaCustomPrompt}
                onPersonaPresetChange={handlePersonaPresetChange}
                onUseCustomPersonaChange={handleUseCustomPersonaChange}
                onPersonaCustomPromptChange={setPersonaCustomPrompt}
              />
            </TabsContent>

            <TabsContent value="memory" className="m-0 min-h-0 overflow-y-auto p-5">
              <MemorySettingsPanel
                memoryEnabled={memoryEnabled}
                autoGenerateFromPrompt={autoGenerateFromPrompt}
                profileSummary={profileSummary}
                userMemory={userMemory}
                favoriteCategories={config.preferences.favoriteCategories}
                memoryStatus={memoryStatus}
                isSaving={isSaving}
                onMemoryEnabledChange={setMemoryEnabled}
                onAutoGenerateFromPromptChange={setAutoGenerateFromPrompt}
                onProfileSummaryChange={setProfileSummary}
                onClearMemory={handleClearMemory}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="m-0 shrink-0 rounded-none border-t border-hairline bg-muted/35 p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ApiSettingsProps = {
  provider: BookAgentProvider
  apiKey: string
  codexModel: string
  codexPath: string
  codexCwd: string
  codexAuthStatus: CodexAuthStatus | undefined
  codexStatusMessage: string
  isCodexStatusLoading: boolean
  onProviderChange: (value: BookAgentProvider) => void
  wechatApiKey: string
  onApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCodexModelChange: (value: string) => void
  onCodexPathChange: (value: string) => void
  onCodexCwdChange: (value: string) => void
  onRefreshCodexStatus: () => void
  onWechatApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const ApiSettings = ({
  provider,
  apiKey,
  codexModel,
  codexPath,
  codexCwd,
  codexAuthStatus,
  codexStatusMessage,
  isCodexStatusLoading,
  onProviderChange,
  wechatApiKey,
  onApiKeyChange,
  onCodexModelChange,
  onCodexPathChange,
  onCodexCwdChange,
  onRefreshCodexStatus,
  onWechatApiKeyChange,
}: ApiSettingsProps) => (
  <FieldGroup>
    <Field>
      <FieldLabel>模型后端</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        value={provider}
        onValueChange={(value) => {
          if (value === 'openrouter' || value === 'codex') {
            onProviderChange(value)
          }
        }}
        spacing={0}
        className="grid w-full grid-cols-2 items-stretch overflow-hidden rounded-xl border border-glass-edge bg-background/35 p-0.5"
      >
        <ToggleGroupItem value="openrouter" className="h-10 rounded-lg border-0 data-[state=on]:bg-card data-[state=on]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
          OpenRouter
        </ToggleGroupItem>
        <ToggleGroupItem value="codex" className="h-10 rounded-lg border-0 data-[state=on]:bg-card data-[state=on]:shadow-[0_1px_10px_-7px_var(--glass-shadow)]">
          Codex
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>
        当前对话和自动记忆提取使用同一个后端。
      </FieldDescription>
    </Field>

    {provider === 'openrouter' ? (
      <Field>
        <FieldLabel htmlFor="openrouter-api-key">OpenRouter API Key</FieldLabel>
        <Input
          id="openrouter-api-key"
          type="password"
          value={apiKey}
          onChange={onApiKeyChange}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-..."
          autoFocus
        />
        <FieldDescription>密钥仅保存在本地。</FieldDescription>
      </Field>
    ) : (
      <CodexSettingsPanel
        codexModel={codexModel}
        codexPath={codexPath}
        codexCwd={codexCwd}
        authStatus={codexAuthStatus}
        statusMessage={codexStatusMessage}
        isLoading={isCodexStatusLoading}
        onCodexModelChange={onCodexModelChange}
        onCodexPathChange={onCodexPathChange}
        onCodexCwdChange={onCodexCwdChange}
        onRefreshStatus={onRefreshCodexStatus}
      />
    )}

    <Field>
      <FieldLabel htmlFor="wechat-api-key">微信读书 API Key</FieldLabel>
      <Input
        id="wechat-api-key"
        type="password"
        value={wechatApiKey}
        onChange={onWechatApiKeyChange}
        autoComplete="off"
        spellCheck={false}
        placeholder="输入微信读书 API Key"
      />
      <FieldDescription>
        获取链接：
        <a href="https://weread.qq.com/r/weread-skills" target="_blank" rel="noreferrer">
          https://weread.qq.com/r/weread-skills
        </a>
      </FieldDescription>
    </Field>
  </FieldGroup>
)

type CodexSettingsPanelProps = {
  codexModel: string
  codexPath: string
  codexCwd: string
  authStatus: CodexAuthStatus | undefined
  statusMessage: string
  isLoading: boolean
  onCodexModelChange: (value: string) => void
  onCodexPathChange: (value: string) => void
  onCodexCwdChange: (value: string) => void
  onRefreshStatus: () => void
}

const CodexSettingsPanel = ({
  codexModel,
  codexPath,
  codexCwd,
  authStatus,
  statusMessage,
  isLoading,
  onCodexModelChange,
  onCodexPathChange,
  onCodexCwdChange,
  onRefreshStatus,
}: CodexSettingsPanelProps) => (
  <>
    <Alert>
      <Info className="size-4" />
      <AlertTitle>Codex 登录状态</AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="grid gap-1 text-xs">
          <span>{authStatus?.loginStatus || '等待检测 Codex 登录状态。'}</span>
          {authStatus ? (
            <span>
              authMode: {authStatus.authMode || 'unknown'} · tokens:{' '}
              {authStatus.hasTokens ? 'yes' : 'no'} · refresh:{' '}
              {authStatus.hasRefreshToken ? 'yes' : 'no'} · lastRefresh:{' '}
              {authStatus.lastRefresh || 'unknown'}
            </span>
          ) : null}
          {statusMessage ? <span>{statusMessage}</span> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefreshStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          刷新状态
        </Button>
      </AlertDescription>
    </Alert>

    <Field>
      <FieldLabel htmlFor="codex-path">Codex CLI 路径</FieldLabel>
      <Input
        id="codex-path"
        value={codexPath}
        onChange={(event) => onCodexPathChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="codex"
      />
      <FieldDescription>可填写完整路径，例如 /opt/homebrew/bin/codex。</FieldDescription>
    </Field>

    <Field>
      <FieldLabel htmlFor="codex-model">Codex 模型 override</FieldLabel>
      <Input
        id="codex-model"
        value={codexModel}
        onChange={(event) => onCodexModelChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="留空使用本机 Codex 默认模型"
      />
    </Field>

    <Field>
      <FieldLabel htmlFor="codex-cwd">Codex 工作目录</FieldLabel>
      <Input
        id="codex-cwd"
        value={codexCwd}
        onChange={(event) => onCodexCwdChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="留空使用 Tauri 进程当前目录"
      />
      <FieldDescription>Codex 以 read-only sandbox 运行。</FieldDescription>
    </Field>
  </>
)

type PersonaSettingsPanelProps = {
  personaPresetId: BookPersonaPresetId
  useCustomPersona: boolean
  personaCustomPrompt: string
  onPersonaPresetChange: (value: string) => void
  onUseCustomPersonaChange: (value: boolean) => void
  onPersonaCustomPromptChange: (value: string) => void
}

const PersonaSettingsPanel = ({
  personaPresetId,
  useCustomPersona,
  personaCustomPrompt,
  onPersonaPresetChange,
  onUseCustomPersonaChange,
  onPersonaCustomPromptChange,
}: PersonaSettingsPanelProps) => {
  const presetPrompt = getBookPersonaPreset(personaPresetId).prompt
  const promptValue = useCustomPersona ? personaCustomPrompt : presetPrompt

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>默认人设</FieldLabel>
        <ToggleGroup
        type="single"
        variant="outline"
        value={personaPresetId}
        onValueChange={onPersonaPresetChange}
          className="grid w-full grid-cols-1 items-stretch gap-2 sm:grid-cols-2"
        >
          {BOOK_PERSONA_PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset.id}
              value={preset.id}
              className="h-auto min-h-16 flex-col items-start justify-start rounded-xl border-glass-edge bg-card/25 px-3 py-2 text-left whitespace-normal data-[state=on]:bg-system-accent-soft data-[state=on]:text-system-accent"
            >
              <span className="text-sm font-medium">{preset.label}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {preset.prompt}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal" className="rounded-xl border border-glass-edge bg-card/35 p-3">
        <Switch
          id="persona-custom"
          checked={useCustomPersona}
          onCheckedChange={onUseCustomPersonaChange}
        />
        <FieldContent>
          <FieldLabel htmlFor="persona-custom">自定义 prompt</FieldLabel>
          <FieldDescription>开启后使用下方内容覆盖默认人设。</FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="persona-prompt">人设 prompt</FieldLabel>
        <Textarea
          id="persona-prompt"
          value={promptValue}
          onChange={(event) => onPersonaCustomPromptChange(event.target.value)}
          rows={7}
          disabled={!useCustomPersona}
          className="min-h-44"
        />
      </Field>
    </FieldGroup>
  )
}

type MemorySettingsPanelProps = {
  memoryEnabled: boolean
  autoGenerateFromPrompt: boolean
  profileSummary: string
  userMemory: UserMemoryView
  favoriteCategories: BookPreferenceCategory[]
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
  userMemory,
  favoriteCategories,
  memoryStatus,
  isSaving,
  onMemoryEnabledChange,
  onAutoGenerateFromPromptChange,
  onProfileSummaryChange,
  onClearMemory,
}: MemorySettingsPanelProps) => {
  const learningRecord = createMemoryLearningRecord(
    userMemory,
    favoriteCategories,
  )

  return (
    <FieldGroup>
      <Field orientation="horizontal" className="rounded-xl border border-glass-edge bg-card/35 p-3">
        <Switch
          id="memory-enabled"
          checked={memoryEnabled}
          onCheckedChange={onMemoryEnabledChange}
        />
        <FieldContent>
          <FieldLabel htmlFor="memory-enabled">启用记忆</FieldLabel>
          <FieldDescription>推荐时使用本地阅读偏好。</FieldDescription>
        </FieldContent>
      </Field>

      <Field orientation="horizontal" className="rounded-xl border border-glass-edge bg-card/35 p-3">
        <Switch
          id="memory-auto-generate"
          checked={autoGenerateFromPrompt}
          onCheckedChange={onAutoGenerateFromPromptChange}
        />
        <FieldContent>
          <FieldLabel htmlFor="memory-auto-generate">自动学习</FieldLabel>
          <FieldDescription>根据提问更新阅读画像。</FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="memory-summary">记忆摘要</FieldLabel>
        <Textarea
          id="memory-summary"
          value={profileSummary}
          onChange={(event) => onProfileSummaryChange(event.target.value)}
          rows={7}
          className="min-h-44"
        />
      </Field>

      <LearningRecordCollapsible record={learningRecord} />

      <Field orientation="horizontal" className="items-start justify-between rounded-xl border border-glass-edge bg-card/35 p-3">
        <FieldContent>
          <FieldTitle>清空记忆</FieldTitle>
          <FieldDescription>清除本地画像和偏好。</FieldDescription>
        </FieldContent>
        <Button
          type="button"
          variant="destructive"
          disabled={isSaving}
          onClick={onClearMemory}
        >
          清空记忆
        </Button>
      </Field>

      {memoryStatus ? (
        <Alert>
          <Info />
          <AlertTitle>记忆状态</AlertTitle>
          <AlertDescription>{memoryStatus}</AlertDescription>
        </Alert>
      ) : null}
    </FieldGroup>
  )
}

type LearningRecordCollapsibleProps = {
  record: MemoryLearningRecord
}

const LearningRecordCollapsible = ({
  record,
}: LearningRecordCollapsibleProps) => (
  <Collapsible className="group/memory-record rounded-xl border border-glass-edge bg-card/30">
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between px-3 py-2.5"
      >
        <span className="flex flex-col items-start gap-0.5 text-left">
          <span>查看学习记录</span>
          <span className="text-xs font-normal text-muted-foreground">
            最近需求、分类和读书计划
          </span>
        </span>
        <ChevronDown
          data-icon="inline-end"
          className="transition-transform group-data-[state=open]/memory-record:rotate-180"
        />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="flex flex-col gap-4 border-t p-3 text-sm">
        {hasMemoryLearningRecord(record) ? (
          <>
            {record.lastLearningStatus ? (
              <LearningStatusBlock record={record} />
            ) : null}

            {record.categories.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  学习分类
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {record.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            {record.recentPrompts.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  近期需求
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {record.recentPrompts.map((prompt, index) => (
                    <li
                      key={`${prompt}-${index}`}
                      className="rounded-md bg-muted px-2.5 py-2 leading-relaxed"
                    >
                      {prompt}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {record.activePlans.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  活跃读书计划
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {record.activePlans.map((plan) => (
                    <li key={plan.id} className="rounded-md bg-muted px-2.5 py-2">
                      <span className="block font-medium">{plan.title}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {plan.goal}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">暂无学习记录。</p>
        )}
      </div>
    </CollapsibleContent>
  </Collapsible>
)

type LearningStatusBlockProps = {
  record: MemoryLearningRecord
}

const LearningStatusBlock = ({ record }: LearningStatusBlockProps) => {
  const status = record.lastLearningStatus

  if (!status) {
    return null
  }

  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-xs font-medium text-muted-foreground">最近学习状态</h4>
      <div className="rounded-md bg-muted px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.status === 'failed' ? 'destructive' : 'secondary'}>
            {learningStatusLabel(status.status)}
          </Badge>
          {status.updatedAt > 0 ? (
            <span className="text-xs text-muted-foreground">
              {formatLearningTimestamp(status.updatedAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {status.message}
        </p>
      </div>
    </section>
  )
}

const learningStatusLabel = (
  status: NonNullable<MemoryLearningRecord['lastLearningStatus']>['status'],
) => {
  switch (status) {
    case 'success':
      return '学习成功'
    case 'failed':
      return '学习失败'
    case 'skipped':
      return '已跳过'
  }
}

const formatLearningTimestamp = (value: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)

const formatError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '记忆操作失败。'
