import { OpenRouter } from '@openrouter/sdk'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

const MODEL = 'deepseek/deepseek-v4-flash'

export async function streamChat(apiKey: string, messages: Message[]) {
  const client = new OpenRouter({ apiKey })
  return client.chat.send({
    chatRequest: {
      model: MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    },
  })
}

export async function callChat(apiKey: string, messages: Message[]): Promise<string> {
  const client = new OpenRouter({ apiKey })
  const result = await client.chat.send({
    chatRequest: {
      model: MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    },
  })
  return result.choices[0].message.content ?? ''
}
