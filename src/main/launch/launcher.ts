import { spawn, type ChildProcess } from 'node:child_process'
import { delimiter } from 'node:path'
import { app } from 'electron'
import { instanceMinecraftDir } from '../paths'
import { rulesAllow } from './rules'
import { dedupeLibraries, librariesRoot, resolveLibraries } from './libraries'
import { assetsRoot } from './assets'
import { nativesDir } from './natives'
import { versionJarPath } from './vanillaInstaller'
import type { Argument, LaunchCredentials, VersionData } from './types'

function substitute(value: string, vars: Record<string, string>): string {
  return value.replace(/\$\{(\w+)\}/g, (_match, key: string) => vars[key] ?? '')
}

/** Flatten a modern argument array, applying rules and placeholder substitution. */
function flattenArgs(args: Argument[] | undefined, vars: Record<string, string>): string[] {
  if (!args) return []
  const out: string[] = []
  for (const arg of args) {
    if (typeof arg === 'string') {
      out.push(substitute(arg, vars))
    } else if (rulesAllow(arg.rules)) {
      const values = Array.isArray(arg.value) ? arg.value : [arg.value]
      for (const value of values) out.push(substitute(value, vars))
    }
  }
  return out
}

export interface BuildArgsOptions {
  instanceId: string
  runtimeKey: string
  /** Name reported to the game as ${version_name} (may be a loader profile id). */
  versionId: string
  /** The vanilla version id whose client JAR to put on the classpath. */
  clientVersionId: string
  /**
   * Whether to append the vanilla client JAR to the classpath. True for Vanilla
   * and Fabric; false for Forge/NeoForge, whose patched client is supplied as a
   * library by the version profile instead.
   */
  includeClientJar: boolean
  creds: LaunchCredentials
  maxMemoryMb: number
}

/**
 * Build the full Java argument vector: JVM args (+ memory), main class, then game
 * args. Supports both modern (arguments.jvm/game) and legacy (minecraftArguments)
 * version formats.
 */
export function buildLaunchArgs(version: VersionData, opts: BuildArgsOptions): string[] {
  // Dedupe by group:artifact for the launch classpath — Forge/NeoForge's module
  // system rejects duplicate jars (loader libs are listed first, so they win).
  const libs = resolveLibraries(dedupeLibraries(version.libraries))
  // Include native jars on the classpath too. The newest versions set
  // -Dorg.lwjgl.system.SharedLibraryExtractPath, which puts LWJGL (and JNA/Netty)
  // into classpath-extraction mode — they load their natives from the JAR on the
  // classpath rather than from java.library.path. Native jars contain no classes,
  // so this is harmless for older versions, which still load from the extracted
  // java.library.path directory.
  const classpath = libs.map((l) => l.path)
  if (opts.includeClientJar) {
    classpath.push(versionJarPath(opts.clientVersionId))
  }

  const vars: Record<string, string> = {
    auth_player_name: opts.creds.name,
    version_name: opts.versionId,
    game_directory: instanceMinecraftDir(opts.instanceId),
    assets_root: assetsRoot(),
    game_assets: assetsRoot(),
    assets_index_name: version.assetIndex.id,
    auth_uuid: opts.creds.uuid,
    auth_access_token: opts.creds.accessToken,
    auth_session: `token:${opts.creds.accessToken}:${opts.creds.uuid}`,
    auth_xuid: opts.creds.xuid,
    clientid: '',
    user_type: 'msa',
    user_properties: '{}',
    version_type: version.type,
    natives_directory: nativesDir(opts.runtimeKey),
    launcher_name: 'nodriftlauncher',
    launcher_version: app.getVersion(),
    classpath: classpath.join(delimiter),
    // Forge/NeoForge module-path args reference these.
    library_directory: librariesRoot(),
    classpath_separator: delimiter
  }

  const memoryArgs = [`-Xmx${opts.maxMemoryMb}M`]

  const jvmArgs = version.arguments?.jvm
    ? flattenArgs(version.arguments.jvm, vars)
    : ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}'].map((a) =>
        substitute(a, vars)
      )

  const gameArgs = version.arguments?.game
    ? flattenArgs(version.arguments.game, vars)
    : version.minecraftArguments
      ? version.minecraftArguments.split(' ').map((a) => substitute(a, vars))
      : []

  return [...memoryArgs, ...jvmArgs, version.mainClass, ...gameArgs]
}

export function spawnGame(
  javaExe: string,
  args: string[],
  gameDir: string
): ChildProcess {
  return spawn(javaExe, args, { cwd: gameDir })
}
