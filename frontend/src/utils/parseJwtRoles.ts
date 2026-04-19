/**
 * Reads role claims from a JWT access token payload (client-side decode only — no signature verification).
 * Used so UI authorization matches what the API enforces from the same token, not editable localStorage fields.
 */
const ROLE_TYPE =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role' as const

function pushRole(out: string[], value: unknown): void {
  if (typeof value === 'string' && value.length > 0) {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      pushRole(out, item)
    }
  }
}

export function parseRolesFromAccessToken(accessToken: string): string[] {
  const parts = accessToken.split('.')
  if (parts.length < 2 || !parts[1]) return []
  try {
    const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4))
    const json = atob(segment + pad)
    const payload = JSON.parse(json) as Record<string, unknown>
    const out: string[] = []
    pushRole(out, payload.role)
    pushRole(out, payload[ROLE_TYPE])
    return [...new Set(out)]
  } catch {
    return []
  }
}
