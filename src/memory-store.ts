import { invoke } from '@tauri-apps/api/core'
import { type BookAgentClientConfig } from './client-config'
import {
  createDefaultUserMemory,
  normalizeUserMemory,
  type UserMemoryView,
} from './memory-data'

export const loadUserMemory = async (): Promise<UserMemoryView> => {
  try {
    return normalizeUserMemory(await invoke('get_user_memory'))
  } catch {
    return createDefaultUserMemory()
  }
}

export const saveUserMemory = async (
  memory: UserMemoryView,
): Promise<UserMemoryView> =>
  normalizeUserMemory(await invoke('save_user_memory', { memory }))

export const clearUserMemory = async (): Promise<UserMemoryView> =>
  normalizeUserMemory(await invoke('clear_user_memory'))

export const generateUserMemoryFromPrompt = async (
  prompt: string,
  config: BookAgentClientConfig,
): Promise<UserMemoryView> =>
  normalizeUserMemory(
    await invoke('generate_user_memory_from_prompt', {
      prompt,
      config: {
        openrouter: {
          apiKey: config.openrouter.apiKey,
          model: config.openrouter.model,
          baseUrl: config.openrouter.baseUrl,
        },
        memory: config.memory,
      },
    }),
  )
