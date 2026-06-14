import { useMemo } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { OpenRouterBookAgent } from './agents/openrouter-book-agent'
import { Thread } from './components/Thread'

export const App = () => {
  const agent = useMemo(() => new OpenRouterBookAgent(), [])
  const runtime = useAgUiRuntime({ agent })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  )
}
