import { launchService, type LaunchState } from '../launch/launchService'
import { getInstance } from '../instances/instanceStore'
import { DiscordPresence, type Activity } from './richPresence'
import { DISCORD_CLIENT_ID, DISCORD_LARGE_IMAGE } from './config'

const IDLE: Activity = {
  details: 'In the launcher',
  state: 'Browsing instances',
  largeImageKey: DISCORD_LARGE_IMAGE,
  largeImageText: 'Nodrift Client'
}

function playing(name: string, since: number): Activity {
  return {
    details: 'Playing Minecraft',
    state: name,
    startTimestamp: since,
    largeImageKey: DISCORD_LARGE_IMAGE,
    largeImageText: 'Nodrift Client'
  }
}

let presence: DiscordPresence | null = null
const running = new Set<string>()

/** Start Discord Rich Presence and keep it in sync with launch state. No-op if
 *  no Discord Application ID is configured. */
export function initDiscordPresence(): void {
  if (!DISCORD_CLIENT_ID) return
  presence = new DiscordPresence(DISCORD_CLIENT_ID)
  presence.start()
  presence.setActivity(IDLE)

  launchService.on('state', (s: LaunchState) => {
    if (!presence) return
    if (s.state === 'running') {
      running.add(s.instanceId)
      void getInstance(s.instanceId).then((inst) =>
        presence?.setActivity(playing(inst?.name ?? 'an instance', Date.now()))
      )
    } else if (s.state === 'exited' || s.state === 'error') {
      running.delete(s.instanceId)
      if (running.size === 0) {
        presence.setActivity(IDLE)
      } else {
        // Another instance is still running — show that one.
        const other = [...running][0]
        void getInstance(other).then((inst) =>
          presence?.setActivity(playing(inst?.name ?? 'an instance', Date.now()))
        )
      }
    }
  })
}

export function stopDiscordPresence(): void {
  presence?.stop()
  presence = null
  running.clear()
}
