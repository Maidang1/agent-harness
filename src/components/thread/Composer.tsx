import { ComposerPrimitive, useAuiState } from '@assistant-ui/react'
import {
  ArrowUp,
  BookOpenText,
  Leaf,
  LoaderCircle,
  Moon,
  Plus,
  Smile,
} from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'

const preferenceChips = [
  {
    label: '低压力',
    text: '我想要低压力、容易进入状态的书。',
    className: 'bg-system-green-soft text-system-green border-system-green/20',
    icon: Leaf,
  },
  {
    label: '短篇',
    text: '请优先推荐短篇或篇幅不长的书。',
    className: 'bg-card/60 text-muted-foreground border-glass-edge',
    icon: BookOpenText,
  },
  {
    label: '睡前',
    text: '我想找适合睡前阅读的书。',
    className: 'bg-system-accent-soft text-system-accent border-system-accent/20',
    icon: Moon,
  },
  {
    label: '治愈',
    text: '请推荐气质治愈、情绪友好的书。',
    className: 'bg-system-green-soft text-system-green border-system-green/20',
    icon: Smile,
  },
]

const insertComposerText = (text: string) => {
  const input = document.getElementById('book-agent-composer')

  if (!(input instanceof HTMLTextAreaElement)) {
    return
  }

  const currentValue = input.value.trim()
  const nextValue = currentValue ? `${currentValue} ${text}` : text

  input.focus()
  input.value = nextValue
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export const Composer = () => {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto px-0.5">
        {preferenceChips.map((chip) => {
          const Icon = chip.icon

          return (
            <Button
              key={chip.label}
              type="button"
              variant="outline"
              size="sm"
              className={`h-8 shrink-0 rounded-full px-3 text-[12px] shadow-none ${chip.className}`}
              onClick={() => insertComposerText(chip.text)}
            >
              <Icon className="size-3.5" data-icon="inline-start" />
              {chip.label}
            </Button>
          )
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3 text-[12px] text-muted-foreground hover:bg-card/60 hover:text-foreground"
          onClick={() => insertComposerText('我的阅读偏好是：')}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          添加偏好
        </Button>
      </div>
      <ComposerPrimitive.Root className="flex flex-col gap-2">
        <InputGroup className="h-auto flex-col items-stretch overflow-hidden rounded-2xl border-glass-edge bg-[color-mix(in_oklch,var(--card)_76%,transparent)] shadow-[0_24px_70px_-48px_var(--glass-shadow),0_0_0_1px_var(--glass-edge)] backdrop-blur-2xl transition-all focus-within:border-system-accent/55 focus-within:shadow-[0_28px_72px_-48px_var(--glass-shadow),0_0_0_1px_color-mix(in_oklch,var(--system-accent)_52%,transparent),0_0_0_4px_color-mix(in_oklch,var(--system-accent)_10%,transparent)]">
          <div className="flex min-h-18 items-start gap-3 px-3 py-3">
            <InputGroupButton
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="添加内容"
              className="mt-0.5 size-9 rounded-xl border-glass-edge bg-background/45 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <Plus className="size-4" />
            </InputGroupButton>
            <ComposerPrimitive.Input
              asChild
              id="book-agent-composer"
              name="message"
              placeholder="继续提问，或输入 / 选择功能"
              autoFocus
            >
              <InputGroupTextarea className="min-h-12 max-h-48 px-0 py-2 text-[14px] leading-7 placeholder:text-muted-foreground/70" />
            </ComposerPrimitive.Input>
            <ComposerPrimitive.Send asChild>
              <InputGroupButton
                variant="default"
                size="icon-sm"
                aria-label="发送消息"
                className="mt-0.5 size-9 rounded-xl bg-system-accent text-primary-foreground shadow-[0_12px_24px_-16px_var(--system-accent)] hover:bg-system-accent/90"
              >
                <SendIcon />
              </InputGroupButton>
            </ComposerPrimitive.Send>
          </div>
          <InputGroupAddon align="block-end" className="border-t border-hairline px-4 py-2">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Enter 发送 · Shift+Enter 换行
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                本地阅读推荐
              </p>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </ComposerPrimitive.Root>
    </div>
  )
}

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return isRunning ? (
    <LoaderCircle className="size-4 animate-spin" />
  ) : (
    <ArrowUp className="size-4" />
  )
}
