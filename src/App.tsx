import { useCallback, useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { OpenRouterBookAgent } from './agents/openrouter-book-agent'
import { Thread } from './components/Thread'
import {
  hasWechatApiKey,
  hasOpenRouterApiKey,
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from './client-config'

export const App = () => {
  const [clientConfig, setClientConfig] = useState(loadClientConfig)
  const [agent] = useState(() => new OpenRouterBookAgent(clientConfig))
  const runtime = useAgUiRuntime({ agent })
  const updateClientConfig = useCallback(
    (config: BookAgentClientConfig) => {
      agent.setClientConfig(config)
      setClientConfig(config)
      saveClientConfig(config)
    },
    [agent],
  )

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        clientConfig={clientConfig}
        onClientConfigChange={updateClientConfig}
        isOpenRouterConfigured={hasOpenRouterApiKey(clientConfig)}
        isWechatConfigured={hasWechatApiKey(clientConfig)}
      />
    </AssistantRuntimeProvider>
  )
}
