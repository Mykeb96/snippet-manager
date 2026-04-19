import { getApiBaseUrl, isRealSnippetApiEnabled, PAGE_SIZE, type SnippetDto } from './snippets'

/** Must stay ≤ backend ApiControllerBase.MaxPageSize (100). */
const FAVORITE_LIST_PAGE_SIZE = 100

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

/** API row: `user` is you (who favorited); `snippet` is the post (with `author` = original poster). */
export type FavoriteListRowDto = {
  userId: number
  snippetId: number
  user: { id: number; username: string }
  snippet: {
    id: number
    title: string
    code: string
    language: string
    createdAt: string
    author: { id: number; username: string }
    tags: { id: number; name: string }[]
  }
}

export type FetchFavoritesPageResult = {
  items: FavoriteListRowDto[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
}

export function favoriteRowToSnippetDto(row: FavoriteListRowDto): SnippetDto {
  const sn = row.snippet
  return {
    id: sn.id,
    title: sn.title,
    code: sn.code,
    language: sn.language,
    createdAt: sn.createdAt,
    userId: sn.author.id,
    user: { id: sn.author.id, username: sn.author.username },
    tags: sn.tags ?? [],
  }
}

/** Loads favorited snippet ids for the signed-in user (JWT). Paginates — requests must use pageSize ≤ 100. */
export async function fetchMyFavoriteSnippetIds(accessToken: string): Promise<Set<number>> {
  if (!isRealSnippetApiEnabled()) {
    return loadMockFavoriteIds()
  }
  const ids = new Set<number>()
  let page = 1
  let hasMore = true
  while (hasMore) {
    const result = await fetchMyFavoritesPage(page, FAVORITE_LIST_PAGE_SIZE, accessToken)
    for (const row of result.items) {
      ids.add(row.snippetId)
    }
    hasMore = result.hasMore
    page += 1
    if (page > 60) break
  }
  return ids
}

/** Legacy: by user id (public GET). Used only where no token is available. */
export async function fetchFavoriteSnippetIdsForUser(userId: number): Promise<Set<number>> {
  if (!isRealSnippetApiEnabled()) {
    return loadMockFavoriteIds()
  }

  const base = getApiBaseUrl()
  const ids = new Set<number>()
  let page = 1
  let hasMore = true
  while (hasMore) {
    const url = new URL(`${base}/api/favorites/user/${userId}`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('pageSize', String(FAVORITE_LIST_PAGE_SIZE))

    const res = await fetch(url.toString())
    if (!res.ok) break

    const rows = (await res.json()) as FavoriteListRowDto[]
    for (const row of rows) {
      if (typeof row.snippetId === 'number') ids.add(row.snippetId)
    }

    const totalHeader = res.headers.get('X-Total-Count')
    const pageHeader = res.headers.get('X-Page')
    const sizeHeader = res.headers.get('X-Page-Size')
    const totalCount = totalHeader != null ? Number.parseInt(totalHeader, 10) : NaN
    const pageNum = pageHeader != null ? Number.parseInt(pageHeader, 10) : page
    const sizeNum = sizeHeader != null ? Number.parseInt(sizeHeader, 10) : FAVORITE_LIST_PAGE_SIZE
    if (Number.isFinite(totalCount) && totalCount >= 0) {
      hasMore = pageNum * sizeNum < totalCount
    } else {
      hasMore = rows.length === FAVORITE_LIST_PAGE_SIZE
    }
    page += 1
    if (page > 60) break
  }
  return ids
}

export async function fetchMyFavoritesPage(
  page: number,
  pageSize = PAGE_SIZE,
  accessToken: string,
): Promise<FetchFavoritesPageResult> {
  if (!isRealSnippetApiEnabled()) {
    return {
      items: [],
      page,
      pageSize,
      totalCount: 0,
      hasMore: false,
    }
  }

  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/favorites/me`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to load favorites (${res.status})`)
  }

  const items = (await res.json()) as FavoriteListRowDto[]
  const totalHeader = res.headers.get('X-Total-Count')
  const pageHeader = res.headers.get('X-Page')
  const sizeHeader = res.headers.get('X-Page-Size')

  const totalCount = totalHeader != null ? Number.parseInt(totalHeader, 10) : NaN
  const pageNum = pageHeader != null ? Number.parseInt(pageHeader, 10) : page
  const sizeNum = sizeHeader != null ? Number.parseInt(sizeHeader, 10) : pageSize

  let hasMore: boolean
  if (Number.isFinite(totalCount) && totalCount >= 0) {
    hasMore = pageNum * sizeNum < totalCount
  } else {
    hasMore = items.length === pageSize
  }

  return {
    items,
    page: pageNum,
    pageSize: sizeNum,
    totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
    hasMore,
  }
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

export async function removeFavorite(snippetId: number, accessToken: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/favorites/me/snippet/${snippetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not remove favorite (${res.status})`)
  }
}
