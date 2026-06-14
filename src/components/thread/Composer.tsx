import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowUp, LoaderCircle, Plus } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export const Composer = () => {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <ComposerPrimitive.Root className="flex flex-col gap-2">
        <InputGroup className="h-auto flex-col items-stretch rounded-lg border-hairline bg-[color-mix(in_oklch,var(--card)_70%,transparent)] shadow-[0_0_0_0.5px_var(--hairline),0_1px_8px_-3px_oklch(0_0_0/0.06)] backdrop-blur-2xl">
          <ComposerPrimitive.Input
            asChild
            id="book-agent-composer"
            name="message"
            placeholder="继续提问，或输入 / 选择功能"
            autoFocus
          >
            <InputGroupTextarea className="min-h-14 max-h-48 px-3 py-2.5 text-[12.5px] leading-relaxed" />
          </ComposerPrimitive.Input>
          <InputGroupAddon align="block-end" className="border-t border-hairline">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">
                Enter 发送 · Shift+Enter 换行
              </p>
              <div className="flex items-center gap-1">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="添加内容"
                  className="size-6 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                </InputGroupButton>
                <ComposerPrimitive.Send asChild>
                  <InputGroupButton
                    variant="default"
                    size="icon-sm"
                    aria-label="发送消息"
                    className="size-6 rounded-md"
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
  );
};

const SendIcon = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return isRunning ? (
    <LoaderCircle className="size-3 animate-spin" />
  ) : (
    <ArrowUp className="size-3" />
  );
};
