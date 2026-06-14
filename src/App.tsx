import { useMemo } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { HttpAgent } from '@ag-ui/client'
import { Thread } from './components/Thread'


export const App = () => {
  const agent = useMemo(
    () => new HttpAgent({ url: '/api/agent' }),
    [],
  )
  const runtime = useAgUiRuntime({ agent })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  )
}
