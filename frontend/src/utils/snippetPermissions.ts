import type { AuthUser } from '../context/authContext'
import type { SnippetDto } from '../api/snippets'

/** Whether the signed-in user may delete this snippet (author, Admin, or Owner). */
export function canDeleteSnippet(
  user: AuthUser | null,
  snippet: SnippetDto,
  realApi: boolean,
  token: string | null,
): boolean {
  if (!user) return false
  const isAuthor = snippet.userId === user.userId
  const isModerator = user.roles.includes('Admin') || user.roles.includes('Owner')
  if (!isAuthor && !isModerator) return false
  if (realApi) return token != null && snippet.id > 0
  return true
}
