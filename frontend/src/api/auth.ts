import { getApiBaseUrl } from './snippets'

export type AuthResponseDto = {
  userId: number
  username: string
  email: string
  accessToken: string
  expiresAtUtc: string
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const json = JSON.parse(text) as unknown
    if (Array.isArray(json)) {
      return json.map(String).join(' ')
    }
    if (json && typeof json === 'object' && 'message' in json) {
      return String((json as { message: unknown }).message)
    }
  } catch {
    /* use text */
  }
  return text || `Request failed (${res.status})`
}

export async function login(body: { email: string; password: string }): Promise<AuthResponseDto> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email.trim(), password: body.password }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<AuthResponseDto>
}

export async function register(body: {
  username: string
  email: string
  password: string
}): Promise<AuthResponseDto> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: body.username.trim(),
      email: body.email.trim(),
      password: body.password,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<AuthResponseDto>
}

export async function changePassword(
  body: { currentPassword: string; newPassword: string },
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}
