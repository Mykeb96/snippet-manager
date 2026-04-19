import type { AuthUser } from '../context/authContext'
import type { SnippetDto } from '../api/snippets'

/** Whether the signed-in user may delete this snippet in the current mode (author or Admin). */
export function canDeleteSnippet(
  user: AuthUser | null,
  snippet: SnippetDto,
  realApi: boolean,
  token: string | null,
): boolean {
  if (!user) return false
  const isOwner = snippet.userId === user.userId
  const isAdmin = user.roles.includes('Admin')
  if (!isOwner && !isAdmin) return false
  if (realApi) return token != null && snippet.id > 0
  return true
}
