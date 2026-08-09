/**
 * Auth configuration.
 *
 * We ship the official Minecraft Launcher public client ID and use the legacy
 * login.live.com OAuth endpoints (Path A — no Azure app / no Minecraft API
 * approval required). Everything that would need to change to move to a
 * registered Azure app later lives in this one object.
 */
export const AUTH_CONFIG = {
  // Official Minecraft Launcher client ID (already approved for the Minecraft
  // API, which is why it avoids the 403 that new Azure apps hit).
  clientId: '00000000402b5328',
  redirectUri: 'https://login.live.com/oauth20_desktop.srf',
  scope: 'service::user.auth.xboxlive.com::MBI_SSL',
  authorizeUrl: 'https://login.live.com/oauth20_authorize.srf',
  tokenUrl: 'https://login.live.com/oauth20_token.srf',
  xbl: {
    authenticateUrl: 'https://user.auth.xboxlive.com/user/authenticate',
    xstsUrl: 'https://xsts.auth.xboxlive.com/xsts/authorize',
    relyingParty: 'rp://api.minecraftservices.com/'
  },
  minecraft: {
    loginWithXboxUrl: 'https://api.minecraftservices.com/authentication/login_with_xbox',
    profileUrl: 'https://api.minecraftservices.com/minecraft/profile'
  }
} as const
