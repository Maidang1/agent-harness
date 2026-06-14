import {
  ComposerPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { CircleNotch, PaperPlaneRight, PlusCircle } from '@phosphor-icons/react'

export const Composer = () => (
  <ComposerPrimitive.Root className="mx-auto flex min-h-[72px] w-full max-w-[880px] items-end gap-3 rounded-3xl border border-[var(--line-strong)] bg-white p-3 shadow-[0_16px_40px_rgba(20,24,28,0.10)]">
    <span className="composer-tool" aria-hidden="true">
      <PlusCircle size={20} />
    </span>
    <ComposerPrimitive.Input
      placeholder="描述你的阅读需求，比如：最近工作压力大，想通过阅读调整心态..."
      className="min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-3 text-[15px] leading-6 text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
      autoFocus
    />
    <ComposerPrimitive.Send className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--send-bg)] text-white transition hover:bg-[var(--send-bg-hover)] active:scale-[0.98] disabled:bg-[var(--send-disabled)] disabled:text-white">
      <SendIcon />
    </ComposerPrimitive.Send>
  </ComposerPrimitive.Root>
)

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return isRunning ? (
    <CircleNotch size={20} className="animate-spin" />
  ) : (
    <PaperPlaneRight size={19} weight="fill" />
  )
}
