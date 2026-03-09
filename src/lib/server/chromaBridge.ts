import { resolve } from 'path'
import { createServer } from 'net'
import { access } from 'fs/promises'
import { constants } from 'fs'
import { spawn, type ChildProcessByStdio } from 'child_process'

import type { Readable } from 'stream'

const LOCAL_HOST = '127.0.0.1'
const DEFAULT_STARTUP_TIMEOUT_MS = 15000
const HEALTH_CHECK_INTERVAL_MS = 250
const CHROMA_SQLITE_FILENAME = 'chroma.sqlite3'

type LocalBridgeState = {
  directory: string
  url: string
  process: ChildProcessByStdio<null, Readable, Readable>
  logs: string[]
  readyPromise: Promise<string>
}

declare global {
  var __chromadbAdminLocalBridges: Map<string, LocalBridgeState> | undefined
  var __chromadbAdminLocalBridgeCleanupRegistered: boolean | undefined
}

function getBridgeRegistry() {
  if (!globalThis.__chromadbAdminLocalBridges) {
    globalThis.__chromadbAdminLocalBridges = new Map<string, LocalBridgeState>()
  }

  if (!globalThis.__chromadbAdminLocalBridgeCleanupRegistered) {
    process.once('exit', () => {
      for (const state of globalThis.__chromadbAdminLocalBridges?.values() ?? []) {
        if (isChildProcessAlive(state.process)) {
          state.process.kill()
        }
      }
    })
    globalThis.__chromadbAdminLocalBridgeCleanupRegistered = true
  }

  return globalThis.__chromadbAdminLocalBridges
}

function isChildProcessAlive(childProcess: ChildProcessByStdio<null, Readable, Readable>) {
  return childProcess.exitCode === null && !childProcess.killed
}

function buildBridgeError(message: string, logs: string[]) {
  const recentLogs = logs.join('').trim()
  return new Error(recentLogs ? `${message}\n${recentLogs}` : message)
}

async function ensureChromaDirectory(directory: string) {
  await access(directory, constants.R_OK)

  try {
    await access(resolve(directory, CHROMA_SQLITE_FILENAME), constants.R_OK)
  } catch {
    throw new Error(`Local Chroma directory must contain ${CHROMA_SQLITE_FILENAME}: ${directory}`)
  }
}

async function getAvailablePort() {
  const server = createServer()

  const port = await new Promise<number>((resolvePort, reject) => {
    server.once('error', reject)
    server.listen(0, LOCAL_HOST, () => {
      const address = server.address()
      if (address && typeof address !== 'string') {
        resolvePort(address.port)
      } else {
        reject(new Error('Unable to allocate a local port for the Chroma bridge'))
      }
    })
  })

  await new Promise<void>((resolveClose, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
      } else {
        resolveClose()
      }
    })
  })

  return port
}

async function isBridgeHealthy(url: string) {
  try {
    const response = await fetch(`${url}/api/v2/heartbeat`)
    if (response.ok) {
      return true
    }
  } catch {
    // ignore and fallback to v1 heartbeat
  }

  try {
    const response = await fetch(`${url}/api/v1/heartbeat`)
    return response.ok
  } catch {
    return false
  }
}

async function waitForBridgeReady(state: LocalBridgeState) {
  const timeoutAt = Date.now() + DEFAULT_STARTUP_TIMEOUT_MS
  let spawnError: Error | undefined

  state.process.once('error', error => {
    spawnError = error
  })

  while (Date.now() < timeoutAt) {
    if (await isBridgeHealthy(state.url)) {
      return state.url
    }

    if (spawnError) {
      if ((spawnError as NodeJS.ErrnoException).code === 'ENOENT') {
        throw buildBridgeError(
          "Local embedded mode requires the 'chroma' CLI in PATH. Install Chroma and ensure `chroma run --path ...` works in your shell.",
          state.logs
        )
      }
      throw buildBridgeError(`Failed to start local Chroma bridge: ${spawnError.message}`, state.logs)
    }

    if (!isChildProcessAlive(state.process)) {
      throw buildBridgeError('Local Chroma bridge exited before becoming ready.', state.logs)
    }

    await new Promise(resolveDelay => setTimeout(resolveDelay, HEALTH_CHECK_INTERVAL_MS))
  }

  throw buildBridgeError(`Timed out waiting for local Chroma bridge to start for ${state.directory}.`, state.logs)
}

function createBridgeState(directory: string, port: number, chromaCliBin?: string) {
  const url = `http://${LOCAL_HOST}:${port}`
  const chromaBin = chromaCliBin || process.env.CHROMA_CLI_BIN || 'chroma'
  const childProcess = spawn(chromaBin, ['run', '--host', LOCAL_HOST, '--port', String(port), '--path', directory], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logs: string[] = []

  childProcess.stdout.on('data', chunk => {
    logs.push(String(chunk))
    if (logs.length > 20) {
      logs.shift()
    }
  })
  childProcess.stderr.on('data', chunk => {
    logs.push(String(chunk))
    if (logs.length > 20) {
      logs.shift()
    }
  })

  const state: LocalBridgeState = {
    directory,
    url,
    process: childProcess,
    logs,
    readyPromise: Promise.resolve(url),
  }

  state.readyPromise = waitForBridgeReady(state)

  return state
}

export async function resolveLocalChromaUrl(connectionString: string, chromaCliBin?: string) {
  const directory = resolve(connectionString)
  await ensureChromaDirectory(directory)

  const registry = getBridgeRegistry()
  const existing = registry.get(directory)

  if (existing) {
    if (isChildProcessAlive(existing.process)) {
      try {
        const existingUrl = await existing.readyPromise
        if (await isBridgeHealthy(existingUrl)) {
          return existingUrl
        }
      } catch {
        // fall through and restart the bridge
      }
    }

    if (isChildProcessAlive(existing.process)) {
      existing.process.kill()
    }

    registry.delete(directory)
  }

  const port = await getAvailablePort()
  const state = createBridgeState(directory, port, chromaCliBin)
  registry.set(directory, state)

  try {
    return await state.readyPromise
  } catch (error) {
    registry.delete(directory)
    if (isChildProcessAlive(state.process)) {
      state.process.kill()
    }
    throw error
  }
}
