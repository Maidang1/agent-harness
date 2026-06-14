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
              <TabsTrigger value="memory" className="h-9 flex-none justify-start">
                <Brain data-icon="inline-start" />
                记忆
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="m-0 flex flex-col gap-5 p-5">
              <ApiSettings
                apiKey={apiKey}
                wechatApiKey={wechatApiKey}
                onApiKeyChange={handleApiKeyChange}
                onWechatApiKeyChange={handleWechatApiKeyChange}
              />
            </TabsContent>

            <TabsContent value="memory" className="m-0 flex flex-col gap-5 p-5">
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
