import { getApiBaseUrl, isRealSnippetApiEnabled } from './snippets'

const MOCK_STORAGE_KEY = 'snippet-manager.mock-favorites'

export function loadMockFavoriteIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(MOCK_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is number => typeof x === 'number'))
  } catch {
    return new Set()
  }
}

export function saveMockFavoriteIds(ids: Set<number>) {
  sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify([...ids]))
}

type FavoriteRow = {
  snippetId: number
  snippet?: { id: number }
}

function rowToSnippetId(row: FavoriteRow): number | undefined {
  const sid = row.snippet?.id ?? row.snippetId
  return typeof sid === 'number' ? sid : undefined
}

/** Loads snippet ids favorited by this user (public list endpoint). */
export async function fetchFavoriteSnippetIdsForUser(userId: number): Promise<Set<number>> {
  if (!isRealSnippetApiEnabled()) {
    return loadMockFavoriteIds()
  }

  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/favorites/user/${userId}`)
  url.searchParams.set('page', '1')
  url.searchParams.set('pageSize', '500')

  const res = await fetch(url.toString())
  if (!res.ok) return new Set()

  const rows = (await res.json()) as FavoriteRow[]
  const ids = new Set<number>()
  for (const row of rows) {
    const sid = rowToSnippetId(row)
    if (sid !== undefined) ids.add(sid)
  }
  return ids
}

export async function addFavorite(snippetId: number, accessToken: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ snippetId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not favorite (${res.status})`)
  }
}

export async function removeFavorite(
  userId: number,
  snippetId: number,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/favorites/user/${userId}/snippet/${snippetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not remove favorite (${res.status})`)
  }
}
