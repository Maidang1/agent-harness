import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  checkForAppUpdate,
  downloadAndInstallAppUpdate,
  formatAppUpdateError,
  restartAppAfterUpdate,
  type AppUpdateClient,
  type AppUpdateDownloadEvent,
  type AppUpdatePackage,
} from '../src/updates/app-updates.ts'

const fixedNow = () => 1700000000000

describe('app updates', () => {
  test('marks the app current when the updater finds no release', async () => {
    const client = createFakeUpdateClient({ update: null })

    const result = await checkForAppUpdate(client, fixedNow)

    assert.equal(result.update, null)
    assert.equal(result.state.phase, 'current')
    assert.equal(result.state.checkedAt, fixedNow())
    assert.equal(result.state.message, '当前已是最新版本。')
  })

  test('keeps update metadata when a release is available', async () => {
    const update = createFakeUpdate({
      version: '0.1.0',
      currentVersion: '0.0.3',
      date: '2026-06-17T07:00:00Z',
      body: '修复自动更新。',
    })
    const client = createFakeUpdateClient({ update })

    const result = await checkForAppUpdate(client, fixedNow)

    assert.equal(result.update, update)
    assert.equal(result.state.phase, 'available')
    assert.deepEqual(result.state.update, {
      version: '0.1.0',
      currentVersion: '0.0.3',
      date: '2026-06-17T07:00:00Z',
      body: '修复自动更新。',
    })
    assert.equal(result.state.message, '发现新版本 0.1.0。')
  })

  test('records check failures as user-facing errors', async () => {
    const client = createFakeUpdateClient({
      checkError: new Error('latest.json returned 404'),
    })

    const result = await checkForAppUpdate(client, fixedNow)

    assert.equal(result.update, null)
    assert.equal(result.state.phase, 'error')
    assert.equal(result.state.message, 'latest.json returned 404')
  })

  test('tracks download progress and marks updates ready to restart', async () => {
    const update = createFakeUpdate({
      version: '0.1.0',
      currentVersion: '0.0.3',
      events: [
        { event: 'Started', data: { contentLength: 100 } },
        { event: 'Progress', data: { chunkLength: 25 } },
        { event: 'Progress', data: { chunkLength: 50 } },
        { event: 'Finished' },
      ],
    })
    const states: string[] = []

    const finalState = await downloadAndInstallAppUpdate(
      update,
      (state) => {
        states.push(`${state.phase}:${state.downloadedBytes ?? 0}:${state.progress ?? 0}`)
      },
      fixedNow,
    )

    assert.deepEqual(states, [
      'downloading:0:0',
      'downloading:0:0',
      'downloading:25:25',
      'downloading:75:75',
      'downloading:100:100',
      'readyToRestart:0:0',
    ])
    assert.equal(finalState.phase, 'readyToRestart')
    assert.equal(finalState.message, '更新已安装，重启后生效。')
  })

  test('relaunches through the update client', async () => {
    const client = createFakeUpdateClient({ update: null })

    await restartAppAfterUpdate(client)

    assert.equal(client.relaunches, 1)
  })

  test('formats unknown thrown values', () => {
    assert.equal(formatAppUpdateError('network failed'), 'network failed')
    assert.equal(formatAppUpdateError({ code: 404 }), '{"code":404}')
  })
})

type FakeUpdateOptions = {
  version?: string
  currentVersion?: string
  date?: string
  body?: string
  events?: AppUpdateDownloadEvent[]
}

const createFakeUpdate = ({
  version = '0.1.0',
  currentVersion = '0.0.0',
  date,
  body,
  events = [],
}: FakeUpdateOptions): AppUpdatePackage => ({
  version,
  currentVersion,
  date,
  body,
  async downloadAndInstall(onEvent) {
    for (const event of events) {
      onEvent?.(event)
    }
  },
})

type FakeUpdateClientOptions = {
  update: AppUpdatePackage | null
  checkError?: unknown
}

const createFakeUpdateClient = ({
  update,
  checkError,
}: FakeUpdateClientOptions): AppUpdateClient & { relaunches: number } => {
  const client: AppUpdateClient & { relaunches: number } = {
    relaunches: 0,
    async check() {
      if (checkError) {
        throw checkError
      }

      return update
    },
    async relaunch() {
      client.relaunches += 1
    },
  }

  return client
}
