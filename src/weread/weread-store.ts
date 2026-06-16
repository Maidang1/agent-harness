import { invoke } from '@tauri-apps/api/core'
import { type BookAgentClientConfig } from '../config/client-config.ts'
import {
  normalizeWereadSnapshot,
  type WereadSnapshot,
} from './weread-data.ts'

export type WereadHighlight = {
  id: string
  bookId: string
  chapterUid: number
  chapterTitle: string
  text: string
  createdAt: number
  createdAtLabel: string
  deepLink: string
}

export type WereadReviewNote = {
  id: string
  content: string
  chapterName: string
  createdAt: number
  createdAtLabel: string
  deepLink: string
}

export type WereadBookNotes = {
  bookId: string
  title: string
  author: string
  highlights: WereadHighlight[]
  reviews: WereadReviewNote[]
}

export const getWereadSnapshot = async (): Promise<WereadSnapshot> =>
  normalizeWereadSnapshot(await invoke('get_weread_snapshot'))

export const syncWereadSnapshot = async (
  config: BookAgentClientConfig,
): Promise<WereadSnapshot> =>
  normalizeWereadSnapshot(
    await invoke('sync_weread_snapshot', {
      config: toWereadCommandConfig(config),
    }),
  )

export const getWereadBookNotes = async (
  bookId: string,
  config: BookAgentClientConfig,
): Promise<WereadBookNotes> =>
  await invoke('get_weread_book_notes', {
    bookId,
    config: toWereadCommandConfig(config),
  })

const toWereadCommandConfig = (config: BookAgentClientConfig) => ({
  wechatApiKey: config.wechatApiKey,
})
