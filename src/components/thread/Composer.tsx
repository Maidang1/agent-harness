import { useState } from 'react'
import { ComposerPrimitive, useAuiState } from '@assistant-ui/react'
import {
  ArrowUp,
  BookOpenText,
  CalendarDays as CalendarIcon,
  Check,
  GitCompare as GitCompareIcon,
  Leaf,
  Library as LibraryIcon,
  ListChecks as ListChecksIcon,
  LoaderCircle,
  Moon,
  Plus,
  Smile,
  Sparkles as SparklesIcon,
} from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const preferenceChips = [
  {
    label: '书架补洞',
    description: '找出书架结构里的空缺。',
    text: '请根据我的微信读书书架，找出阅读结构里的空缺，并推荐下一步补洞书单。',
    icon: LibraryIcon,
    group: '任务模板',
  },
  {
    label: '划线复盘',
    description: '整理观点、证据和行动。',
    text: '请根据我的微信读书划线和笔记，按核心观点、关键划线、我的理解、可执行行动、延伸阅读做一次读后复盘。',
    icon: BookOpenText,
    group: '任务模板',
  },
  {
    label: '本周计划',
    description: '按时间和精力安排节奏。',
    text: '请结合我的阅读偏好、当前计划和书架，制定一个本周可执行的读书计划。',
    icon: CalendarIcon,
    group: '任务模板',
  },
  {
    label: '对比两本',
    description: '比较差异并给出选择。',
    text: '请帮我比较这两本书，并给出更适合我当前目标的一本：',
    icon: GitCompareIcon,
    group: '任务模板',
  },
  {
    label: '待读清单',
    description: '按优先级整理待读书。',
    text: '请整理我的待读清单，按优先级、阅读场景和预计阅读时间排序。',
    icon: ListChecksIcon,
    group: '任务模板',
  },
  {
    label: '推荐依据',
    description: '解释每本书的推荐证据。',
    text: '请解释刚才推荐每本书的依据，分别关联我的偏好、历史提问、读书计划或微信读书数据。',
    icon: SparklesIcon,
    group: '任务模板',
  },
  {
    label: '低压力',
    description: '降低进入门槛。',
    text: '我想要低压力、容易进入状态的书。',
    icon: Leaf,
    group: '阅读偏好',
  },
  {
    label: '短篇',
    description: '控制篇幅和完成成本。',
    text: '请优先推荐短篇或篇幅不长的书。',
    icon: BookOpenText,
    group: '阅读偏好',
  },
  {
    label: '睡前',
    description: '适合晚上慢读。',
    text: '我想找适合睡前阅读的书。',
    icon: Moon,
    group: '阅读偏好',
  },
  {
    label: '治愈',
    description: '情绪友好、气质温和。',
    text: '请推荐气质治愈、情绪友好的书。',
    icon: Smile,
    group: '阅读偏好',
  },
] satisfies Array<{
  label: string
  description: string
  text: string
  icon: typeof LibraryIcon
  group: '任务模板' | '阅读偏好'
}>

type PreferenceChip = (typeof preferenceChips)[number]

const getComposerInput = () => {
  const input = document.getElementById('book-agent-composer')

  if (!(input instanceof HTMLTextAreaElement)) {
    return null
  }

  return input
}

const setComposerText = (value: string) => {
  const input = getComposerInput()

  if (!input) {
    return
  }

  input.focus()
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const insertComposerText = (text: string) => {
  const input = getComposerInput()

  if (!input) {
    return
  }

  const currentValue = input.value.trim()
  const nextValue = currentValue ? `${currentValue} ${text}` : text

  setComposerText(nextValue)
}

export const Composer = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)

  const handlePromptSelect = (chip: PreferenceChip) => {
    const previousPrompt = preferenceChips.find(
      (item) => item.label === selectedPrompt,
    )
    const input = getComposerInput()

    setSelectedPrompt(chip.label)

    if (!input) {
      return
    }

    const currentValue = previousPrompt
      ? input.value.replace(previousPrompt.text, '').replace(/\s{2,}/g, ' ').trim()
      : input.value.trim()
    const nextValue = currentValue ? `${currentValue} ${chip.text}` : chip.text

    setComposerText(nextValue)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <ComposerPrimitive.Root className="flex flex-col gap-2">
        <InputGroup
          className="h-auto flex-col items-stretch overflow-hidden rounded-2xl border-glass-edge bg-[color-mix(in_oklch,var(--card)_76%,transparent)] shadow-[0_24px_70px_-48px_var(--glass-shadow),0_0_0_1px_var(--glass-edge)] backdrop-blur-2xl transition-all focus-within:border-system-accent/55 focus-within:shadow-[0_28px_72px_-48px_var(--glass-shadow),0_0_0_1px_color-mix(in_oklch,var(--system-accent)_52%,transparent),0_0_0_4px_color-mix(in_oklch,var(--system-accent)_10%,transparent)]"
        >
          <div className="flex min-h-18 items-start gap-3 px-3 py-3">
            <Popover>
              <PopoverTrigger asChild>
                <InputGroupButton
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="选择阅读任务"
                  className="mt-0.5 size-9 rounded-xl border-glass-edge bg-background/45 text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  <Plus className="size-4" />
                </InputGroupButton>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-96 max-w-[calc(100vw-2rem)] p-0"
              >
                <QuickPromptList
                  selectedPrompt={selectedPrompt}
                  onPromptSelect={handlePromptSelect}
                />
              </PopoverContent>
            </Popover>
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

const QuickPromptList = ({
  selectedPrompt,
  onPromptSelect,
}: {
  selectedPrompt: string | null
  onPromptSelect: (chip: PreferenceChip) => void
}) => (
  <fieldset className="min-w-0">
    <legend className="sr-only">阅读任务入口</legend>
    <div className="border-b border-hairline px-3 py-2.5">
      <p className="text-[12px] font-semibold">阅读任务</p>
      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
        选择模板后会填入输入框，可继续补充书名、场景或目标。
      </p>
    </div>
    <div role="radiogroup" className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      {(['任务模板', '阅读偏好'] as const).map((group) => (
        <div key={group} className="mb-2 last:mb-0">
          <div className="px-2 pb-1.5 pt-1 text-[10.5px] font-medium text-muted-foreground">
            {group}
          </div>
          <div className="flex flex-col gap-1">
            {preferenceChips
              .filter((chip) => chip.group === group)
              .map((chip) => (
                <QuickPromptRow
                  key={chip.label}
                  chip={chip}
                  checked={selectedPrompt === chip.label}
                  onPromptSelect={onPromptSelect}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
    <div className="border-t border-hairline p-2">
      <button
        type="button"
        className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-[11.5px] text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
        onClick={() => insertComposerText('我的阅读偏好是：')}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-hairline bg-background/45">
          <Plus className="size-3" />
        </span>
        <span className="min-w-0 flex-1 truncate">添加自定义偏好</span>
      </button>
    </div>
  </fieldset>
)

const QuickPromptRow = ({
  chip,
  checked,
  onPromptSelect,
}: {
  chip: PreferenceChip
  checked: boolean
  onPromptSelect: (chip: PreferenceChip) => void
}) => {
  const Icon = chip.icon

  return (
    <label
      className={cn(
        'flex min-h-11 min-w-0 cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-card/60',
        checked && 'bg-system-accent-soft text-system-accent',
      )}
    >
      <input
        type="radio"
        name="reading-quick-prompt"
        checked={checked}
        onChange={() => onPromptSelect(chip)}
        className="sr-only"
      />
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-hairline bg-background/45',
          checked && 'border-system-accent/25 bg-card text-system-accent',
        )}
      >
        {checked ? <Check className="size-3" /> : <Icon className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium leading-5 text-foreground">
          {chip.label}
        </span>
        <span className="block text-[11px] leading-4 text-muted-foreground">
          {chip.description}
        </span>
      </span>
    </label>
  )
}

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <LoaderCircle className="size-4 animate-spin" />
  ) : (
    <ArrowUp className="size-4" />
  )
}
