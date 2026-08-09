import { AUTH_CONFIG } from './config'
import { AuthError, type MsaTokens } from './types'

/** Build the Microsoft authorize URL the login window navigates to. */
export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: AUTH_CONFIG.redirectUri,
    scope: AUTH_CONFIG.scope
  })
  return `${AUTH_CONFIG.authorizeUrl}?${params.toString()}`
}

interface RawTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  error?: string
  error_description?: string
}

async function requestToken(body: URLSearchParams): Promise<MsaTokens> {
  const res = await fetch(AUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  const data = (await res.json()) as RawTokenResponse
  if (!res.ok || data.error) {
    throw new AuthError(
      data.error_description || data.error || `Microsoft token request failed (${res.status})`,
      'MSA_TOKEN'
    )
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000
  }
}

/** Exchange the one-time authorization code for tokens. */
export function exchangeCodeForTokens(code: string): Promise<MsaTokens> {
  return requestToken(
    new URLSearchParams({
      client_id: AUTH_CONFIG.clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: AUTH_CONFIG.redirectUri
    })
  )
}

/** Use a stored refresh token to silently obtain a fresh token set. */
export async function refreshTokens(refreshToken: string): Promise<MsaTokens> {
  const tokens = await requestToken(
    new URLSearchParams({
      client_id: AUTH_CONFIG.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: AUTH_CONFIG.scope,
      redirect_uri: AUTH_CONFIG.redirectUri
    })
  )
  // login.live.com does not always rotate the refresh token; if the response
  // omits one, keep re-using the existing token so the session survives.
  if (!tokens.refreshToken) tokens.refreshToken = refreshToken
  return tokens
}
