import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { instanceMinecraftDir } from '../paths'
import { getInstance, markPlayed } from '../instances/instanceStore'
import { authService } from '../auth/authService'
import { getMinecraftVersions } from '../metadata/metadataService'
import { installVanilla, isVanillaInstalled, loadInstalledVersion } from './vanillaInstaller'
import {
  fabricVersionId,
  installFabric,
  isFabricInstalled,
  loadFabricVersion
} from './fabricInstaller'
import {
  forgeLikeVersionId,
  installForgeLike,
  isForgeLikeInstalled,
  loadForgeLikeVersion
} from './forgeInstaller'
import { buildLaunchArgs, spawnGame } from './launcher'
import { ensureJava, javaExecutable } from './java'
import { resolveLibraries } from './libraries'
import { computeNativesLayout, ensureNatives, nativesDir } from './natives'
import type { InstallPhase, VersionData } from './types'

export interface LaunchProgress {
  instanceId: string
  phase: InstallPhase
  done: number
  total: number
}

export type LaunchState =
  | { instanceId: string; state: 'preparing' }
  | { instanceId: string; state: 'installing' }
  | { instanceId: string; state: 'launching' }
  | { instanceId: string; state: 'running' }
  | { instanceId: string; state: 'exited'; code: number | null }
  | { instanceId: string; state: 'error'; message: string }

export interface LaunchLog {
  instanceId: string
  line: string
  stream: 'out' | 'err'
}

const DEFAULT_MAX_MEMORY_MB = 2048

/**
 * Orchestrates install-then-launch for an instance and surfaces progress, log
 * output and lifecycle state as events (relayed to the renderer over IPC). Only
 * Vanilla is wired up in this step; loaders come next.
 */
class LaunchService extends EventEmitter {
  private running = new Map<string, ChildProcess>()

  isRunning(instanceId: string): boolean {
    return this.running.has(instanceId)
  }

  async launch(instanceId: string): Promise<void> {
    if (this.running.has(instanceId)) return

    const instance = await getInstance(instanceId)
    if (!instance) throw new Error('Instance not found.')

    const creds = authService.getLaunchCredentials()
    if (!creds) throw new Error('Sign in with Microsoft before launching.')

    this.emitState({ instanceId, state: 'preparing' })

    const report = (phase: InstallPhase, done: number, total: number): void => {
      this.emit('progress', { instanceId, phase, done, total } satisfies LaunchProgress)
    }

    const clientVersionId = instance.mcVersion
    const loaderVersion = instance.loaderVersion ?? ''
    let versionId = instance.mcVersion
    let version: VersionData

    // 1. Ensure the base vanilla version is present.
    const vanilla = await this.ensureVanilla(instance.mcVersion, () => {
      this.emitState({ instanceId, state: 'installing' })
    }, report)

    // 2. Ensure Java early — loader processors (Forge/NeoForge) need it to run.
    const component = vanilla.javaVersion?.component ?? 'jre-legacy'
    const javaExe = javaExecutable(component)
    await ensureJava(component, (done, total) =>
      this.emit('progress', { instanceId, phase: 'java', done, total } satisfies LaunchProgress)
    )

    // 3. Apply the loader on top of vanilla (if any).
    const includeClientJar = instance.loader === 'vanilla' || instance.loader === 'fabric'
    if (instance.loader === 'fabric') {
      versionId = fabricVersionId(instance.mcVersion, loaderVersion)
      version = (await isFabricInstalled(versionId))
        ? await loadFabricVersion(versionId)
        : await this.withInstalling(instanceId, () =>
            installFabric(vanilla, instance.mcVersion, loaderVersion, report)
          )
    } else if (instance.loader === 'forge' || instance.loader === 'neoforge') {
      const forgeLoader = instance.loader
      versionId = forgeLikeVersionId(forgeLoader, loaderVersion)
      version = (await isForgeLikeInstalled(versionId))
        ? await loadForgeLikeVersion(versionId)
        : await this.withInstalling(instanceId, () =>
            installForgeLike(forgeLoader, instance.mcVersion, loaderVersion, vanilla, javaExe, report)
          )
    } else {
      version = vanilla
    }

    // Extract natives to the layout this version expects (idempotent — also
    // repairs installs made before the newer subdir layout was handled).
    this.emit('progress', { instanceId, phase: 'natives', done: 0, total: 1 } satisfies LaunchProgress)
    const nativeJars = resolveLibraries(version.libraries)
      .filter((l) => l.isNative)
      .map((l) => l.path)
    const layout = computeNativesLayout(version, nativesDir(instance.runtimeKey))
    await ensureNatives(nativeJars, layout)
    this.emit('progress', { instanceId, phase: 'natives', done: 1, total: 1 } satisfies LaunchProgress)

    await markPlayed(instanceId)

    const args = buildLaunchArgs(version, {
      instanceId,
      runtimeKey: instance.runtimeKey,
      versionId,
      clientVersionId,
      includeClientJar,
      creds,
      maxMemoryMb: DEFAULT_MAX_MEMORY_MB
    })

    this.emitState({ instanceId, state: 'launching' })
    const child = spawnGame(javaExe, args, instanceMinecraftDir(instanceId))
    this.running.set(instanceId, child)
    this.emitState({ instanceId, state: 'running' })

    child.stdout?.on('data', (chunk: Buffer) =>
      this.emitLog({ instanceId, line: chunk.toString(), stream: 'out' })
    )
    child.stderr?.on('data', (chunk: Buffer) =>
      this.emitLog({ instanceId, line: chunk.toString(), stream: 'err' })
    )
    child.on('exit', (code) => {
      this.running.delete(instanceId)
      this.emitState({ instanceId, state: 'exited', code })
    })
    child.on('error', (err) => {
      this.running.delete(instanceId)
      this.emitLog({ instanceId, line: `Failed to start game: ${err.message}`, stream: 'err' })
      this.emitState({ instanceId, state: 'error', message: err.message })
    })
  }

  stop(instanceId: string): void {
    this.running.get(instanceId)?.kill()
  }

  /** Emit the 'installing' state, run the installer, and return its result. */
  private async withInstalling<T>(instanceId: string, fn: () => Promise<T>): Promise<T> {
    this.emitState({ instanceId, state: 'installing' })
    return fn()
  }

  /** Ensure a vanilla version is installed; installs it if missing. */
  private async ensureVanilla(
    mcVersion: string,
    onInstallStart: () => void,
    report: (phase: InstallPhase, done: number, total: number) => void
  ): Promise<VersionData> {
    if (await isVanillaInstalled(mcVersion)) {
      return loadInstalledVersion(mcVersion)
    }
    onInstallStart()
    const versionUrl = await this.resolveVersionUrl(mcVersion)
    return installVanilla(mcVersion, versionUrl, report)
  }

  private async resolveVersionUrl(versionId: string): Promise<string> {
    const versions = await getMinecraftVersions()
    const match = versions.find((v) => v.id === versionId)
    if (!match) throw new Error(`Minecraft version ${versionId} not found in the manifest.`)
    return match.url
  }

  private emitState(state: LaunchState): void {
    this.emit('state', state)
  }

  private emitLog(log: LaunchLog): void {
    this.emit('log', log)
  }
}

export const launchService = new LaunchService()
