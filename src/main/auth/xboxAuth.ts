import { AUTH_CONFIG } from './config'
import { AuthError, type XboxAuth } from './types'

interface XblAuthResponse {
  Token: string
  DisplayClaims: { xui: Array<{ uhs: string }> }
}

/**
 * Exchange the Microsoft access token for an Xbox Live user token.
 *
 * The RpsTicket format differs by token source: legacy login.live.com tokens
 * (our Path A) are sent verbatim, whereas Azure AD tokens require a `d=` prefix.
 * We try verbatim first and fall back to the prefixed form so both work.
 */
export async function authenticateXbox(msaAccessToken: string): Promise<XboxAuth> {
  const attempt = (rpsTicket: string): Promise<Response> =>
    fetch(AUTH_CONFIG.xbl.authenticateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: rpsTicket
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      })
    })

  let res = await attempt(msaAccessToken)
  if (!res.ok) {
    res = await attempt(`d=${msaAccessToken}`)
  }
  if (!res.ok) {
    throw new AuthError(`Xbox Live authentication failed (${res.status})`, 'XBL')
  }

  const data = (await res.json()) as XblAuthResponse
  const userHash = data.DisplayClaims?.xui?.[0]?.uhs
  if (!data.Token || !userHash) {
    throw new AuthError('Xbox Live response missing token or user hash', 'XBL')
  }
  return { token: data.Token, userHash }
}

interface XstsResponse {
  Token: string
  DisplayClaims: { xui: Array<{ uhs: string; xid?: string }> }
  XErr?: number
  Message?: string
}

export interface XstsAuth extends XboxAuth {
  /** Xbox user id (XUID), passed to the game as ${auth_xuid}. */
  xuid: string
}

/** Exchange the Xbox Live token for an XSTS token scoped to Minecraft services. */
export async function authorizeXsts(xblToken: string): Promise<XstsAuth> {
  const res = await fetch(AUTH_CONFIG.xbl.xstsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
      RelyingParty: AUTH_CONFIG.xbl.relyingParty,
      TokenType: 'JWT'
    })
  })

  const data = (await res.json()) as XstsResponse
  if (!res.ok || !data.Token) {
    const message =
      describeXstsError(data.XErr) ??
      data.Message ??
      `XSTS authorization failed (${res.status})`
    throw new AuthError(message, data.XErr ? String(data.XErr) : 'XSTS')
  }

  const claims = data.DisplayClaims?.xui?.[0]
  if (!claims?.uhs) {
    throw new AuthError('XSTS response missing user hash', 'XSTS')
  }
  return { token: data.Token, userHash: claims.uhs, xuid: claims.xid ?? '' }
}

/** Map known XSTS XErr codes to human-friendly guidance. */
function describeXstsError(xerr?: number): string | null {
  switch (xerr) {
    case 2148916233:
      return 'This Microsoft account has no Xbox profile. Sign in once at minecraft.net or xbox.com to create one, then try again.'
    case 2148916235:
      return 'Xbox Live is not available in your country or region.'
    case 2148916236:
    case 2148916237:
      return 'This account requires adult verification.'
    case 2148916238:
      return 'This is a child account and must be added to a Family group by an adult before it can sign in.'
    default:
      return null
  }
}
