import { invoke } from '@tauri-apps/api/core'
import {
  normalizeReadingWorkspace,
  type ReadingWorkspace,
} from './reading-workspace.ts'

export const getReadingWorkspace = async (): Promise<ReadingWorkspace> =>
  normalizeReadingWorkspace(await invoke('get_reading_workspace'))

export const saveReadingWorkspace = async (
  workspace: ReadingWorkspace,
): Promise<ReadingWorkspace> =>
  normalizeReadingWorkspace(
    await invoke('save_reading_workspace', { workspace }),
  )
