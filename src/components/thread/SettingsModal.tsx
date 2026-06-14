import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Brain,
  Info,
  KeyRound,
  LoaderCircle,
  UserRound,
} from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  type BookAgentClientConfig,
  type BookPersonaPresetId,
} from '../../client-config'
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
  const [apiKey, setApiKey] = useState(config.openrouter.apiKey)
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
    persona: {
      presetId: personaPresetId,
      customPrompt: personaCustomPrompt,
      useCustomPrompt: useCustomPersona,
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
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader className="border-b p-5 pr-14">
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>
              配置模型访问和本地阅读记忆。
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SettingsTab)}
            className="min-h-0 flex-1 gap-0 md:grid md:grid-cols-[12rem_minmax(0,1fr)]"
          >
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-muted/50 p-3 md:h-full md:w-auto md:flex-col md:items-stretch md:border-b-0 md:border-r">
              <TabsTrigger value="api" className="h-9 flex-none justify-start">
                <KeyRound data-icon="inline-start" />
                API Key
              </TabsTrigger>
              <TabsTrigger value="persona" className="h-9 flex-none justify-start">
                <UserRound data-icon="inline-start" />
                人设
              </TabsTrigger>
              <TabsTrigger value="memory" className="h-9 flex-none justify-start">
                <Brain data-icon="inline-start" />
                记忆
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="m-0 flex flex-col gap-5 overflow-y-auto p-5">
              <ApiSettings
                apiKey={apiKey}
                wechatApiKey={wechatApiKey}
                onApiKeyChange={handleApiKeyChange}
                onWechatApiKeyChange={handleWechatApiKeyChange}
              />
            </TabsContent>

            <TabsContent value="persona" className="m-0 flex flex-col gap-5 overflow-y-auto p-5">
              <PersonaSettingsPanel
                personaPresetId={personaPresetId}
                useCustomPersona={useCustomPersona}
                personaCustomPrompt={personaCustomPrompt}
                onPersonaPresetChange={handlePersonaPresetChange}
                onUseCustomPersonaChange={handleUseCustomPersonaChange}
                onPersonaCustomPromptChange={setPersonaCustomPrompt}
              />
            </TabsContent>

            <TabsContent value="memory" className="m-0 flex flex-col gap-5 overflow-y-auto p-5">
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
            </TabsContent>
          </Tabs>

          <DialogFooter className="m-0 rounded-none border-t bg-muted/50 p-4">
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
  <FieldGroup>
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
          className="grid w-full grid-cols-1 items-stretch sm:grid-cols-2"
        >
          {BOOK_PERSONA_PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset.id}
              value={preset.id}
              className="h-auto min-h-16 flex-col items-start justify-start whitespace-normal px-3 py-2 text-left"
            >
              <span className="text-sm font-medium">{preset.label}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {preset.prompt}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal" className="rounded-lg border p-3">
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
  <FieldGroup>
    <Field orientation="horizontal" className="rounded-lg border p-3">
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

    <Field orientation="horizontal" className="rounded-lg border p-3">
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

    <Field orientation="horizontal" className="items-start justify-between rounded-lg border p-3">
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

const formatError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '记忆操作失败。'
