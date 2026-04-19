import type { AuthUser } from '../context/authContext'
import type { SnippetDto } from '../api/snippets'

/** Whether the signed-in user may delete this snippet in the current mode. */
export function canDeleteSnippet(
  user: AuthUser | null,
  snippet: SnippetDto,
  realApi: boolean,
  token: string | null,
): boolean {
  if (!user || snippet.userId !== user.userId) return false
  if (realApi) return token != null && snippet.id > 0
  return true
}
