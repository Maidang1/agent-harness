import { useState } from 'react'
import {
  ComposerPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import {
  ArrowUp,
  LoaderCircle,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

const preferenceChips = ['低压力', '短篇', '睡前', '治愈']

export const Composer = () => {
  const [selectedPreferences, setSelectedPreferences] = useState([
    '低压力',
    '睡前',
  ])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" aria-label="阅读偏好">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={1}
          value={selectedPreferences}
          onValueChange={setSelectedPreferences}
          className="flex-wrap"
        >
          {preferenceChips.map((preference) => (
            <ToggleGroupItem key={preference} value={preference}>
              {preference}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button type="button" variant="ghost" size="sm">
          <Plus data-icon="inline-start" />
          添加偏好
        </Button>
      </div>

      <ComposerPrimitive.Root className="flex flex-col gap-2">
        <InputGroup className="h-auto flex-col items-stretch bg-card shadow-lg">
          <ComposerPrimitive.Input
            asChild
            id="book-agent-composer"
            name="message"
            placeholder="继续提问，或输入 / 选择功能"
            autoFocus
          >
            <InputGroupTextarea className="min-h-20 max-h-52 px-3 py-3 text-sm" />
          </ComposerPrimitive.Input>
          <InputGroupAddon align="block-end" className="border-t">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                按 Enter 发送，Shift + Enter 换行
              </p>
              <div className="flex items-center gap-1">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="添加内容"
                >
                  <Plus />
                </InputGroupButton>
                <ComposerPrimitive.Send asChild>
                  <InputGroupButton
                    variant="default"
                    size="icon-sm"
                    aria-label="发送消息"
                  >
                    <SendIcon />
                  </InputGroupButton>
                </ComposerPrimitive.Send>
              </div>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </ComposerPrimitive.Root>
    </div>
  )
}

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <LoaderCircle className="animate-spin" />
  ) : (
    <ArrowUp />
  )
}
