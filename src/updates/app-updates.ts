import { invoke } from '@tauri-apps/api/core'

export type AppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'current'
  | 'available'
  | 'downloading'
  | 'readyToRestart'
  | 'error'

export type AppUpdateInfo = {
  version: string
  currentVersion: string
  date?: string
  body?: string
}

export type AppUpdateState = {
  phase: AppUpdatePhase
  checkedAt?: number
  message?: string
  update?: AppUpdateInfo
  downloadedBytes?: number
  contentLength?: number
  progress?: number
}

export type AppUpdateDownloadEvent =
  | {
      event: 'Started'
      data: {
        contentLength?: number
      }
    }
  | {
      event: 'Progress'
      data: {
        chunkLength: number
      }
    }
  | {
      event: 'Finished'
      data?: unknown
    }

export type AppUpdatePackage = AppUpdateInfo & {
  downloadAndInstall: (
    onEvent?: (event: AppUpdateDownloadEvent) => void,
  ) => Promise<void>
}

export type AppUpdateClient = {
  check: () => Promise<AppUpdatePackage | null>
  relaunch: () => Promise<void>
}

export type AppUpdateCheckResult = {
  state: AppUpdateState
  update: AppUpdatePackage | null
}

export type AppMetadata = {
  name: string
  version: string
}

export const createInitialAppUpdateState = (): AppUpdateState => ({
  phase: 'idle',
})

export const checkForAppUpdate = async (
  client: AppUpdateClient,
  now = Date.now,
): Promise<AppUpdateCheckResult> => {
  try {
    const update = await client.check()
    const checkedAt = now()

    if (!update) {
      return {
        update: null,
        state: {
          phase: 'current',
          checkedAt,
          message: '当前已是最新版本。',
        },
      }
    }

    const updateInfo = normalizeUpdateInfo(update)

    return {
      update,
      state: {
        phase: 'available',
        checkedAt,
        update: updateInfo,
        message: `发现新版本 ${updateInfo.version}。`,
      },
    }
  } catch (error) {
    return {
      update: null,
      state: {
        phase: 'error',
        checkedAt: now(),
        message: formatAppUpdateError(error),
      },
    }
  }
}

export const downloadAndInstallAppUpdate = async (
  update: AppUpdatePackage,
  onStateChange: (state: AppUpdateState) => void,
  now = Date.now,
) => {
  const updateInfo = normalizeUpdateInfo(update)
  let downloadedBytes = 0
  let contentLength = 0

  const emitDownloading = () => {
    onStateChange({
      phase: 'downloading',
      update: updateInfo,
      downloadedBytes,
      contentLength,
      progress: calculateProgress(downloadedBytes, contentLength),
    })
  }

  emitDownloading()

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      contentLength = normalizeByteCount(event.data.contentLength)
      downloadedBytes = 0
      emitDownloading()
      return
    }

    if (event.event === 'Progress') {
      downloadedBytes += normalizeByteCount(event.data.chunkLength)
      emitDownloading()
      return
    }

    if (event.event === 'Finished') {
      downloadedBytes = contentLength
      emitDownloading()
    }
  })

  const readyState: AppUpdateState = {
    phase: 'readyToRestart',
    checkedAt: now(),
    update: updateInfo,
    message: '更新已安装，重启后生效。',
  }

  onStateChange(readyState)

  return readyState
}

export const restartAppAfterUpdate = async (client: AppUpdateClient) => {
  await client.relaunch()
}

export const getAppMetadata = async (): Promise<AppMetadata> =>
  await invoke('get_app_metadata')

export const isTauriRuntime = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const createTauriAppUpdateClient = (): AppUpdateClient => ({
  async check() {
    const { check } = await import('@tauri-apps/plugin-updater')

    return (await check()) as AppUpdatePackage | null
  },
  async relaunch() {
    const { relaunch } = await import('@tauri-apps/plugin-process')

    await relaunch()
  },
})

export const formatAppUpdateError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return '更新检测失败。'
  }
}

const normalizeUpdateInfo = (update: AppUpdateInfo): AppUpdateInfo => ({
  version: update.version,
  currentVersion: update.currentVersion,
  date: update.date,
  body: update.body,
})

const normalizeByteCount = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0
  }

  return value
}

const calculateProgress = (downloadedBytes: number, contentLength: number) => {
  if (contentLength <= 0) {
    return 0
  }

  return Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
}
