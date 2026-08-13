import { join } from 'node:path'
import { ensureDir, instanceMinecraftDir } from '../paths'
import { downloadFile } from '../launch/net'
import { getInstance } from '../instances/instanceStore'
import { resolvePackVersion, type ProjectType } from './modrinth'

/** Resource packs and shaders live in their own instance folders, not mods/. */
function packDir(instanceId: string, projectType: ProjectType): string {
  const sub = projectType === 'shader' ? 'shaderpacks' : 'resourcepacks'
  return join(instanceMinecraftDir(instanceId), sub)
}

/**
 * Download a Modrinth resource pack or shader into the right instance folder.
 * Unlike mods these aren't tied to a loader, so any instance is a valid target
 * and only the Minecraft version constrains which file is chosen.
 */
export async function installPack(
  instanceId: string,
  projectId: string,
  projectType: 'resourcepack' | 'shader',
  _title: string
): Promise<void> {
  const instance = await getInstance(instanceId)
  if (!instance) throw new Error('Instance not found.')

  const best = await resolvePackVersion(projectId, instance.mcVersion)
  if (!best) {
    throw new Error(`No version of this ${projectType} matches Minecraft ${instance.mcVersion}.`)
  }

  const dir = packDir(instanceId, projectType)
  await ensureDir(dir)
  await downloadFile(best.url, join(dir, best.filename), best.sha1)
}
