import { getApiBaseUrl } from './snippets'
import type { TagDto } from './snippets'

const PAGE_SIZE = 50

function normalizeAdminUsers(raw: unknown): AdminUserDto[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const o = row as Record<string, unknown>
    return {
      id: Number(o.id),
      username: String(o.username ?? ''),
      email: String(o.email ?? ''),
      isAdmin: Boolean(o.isAdmin ?? o.IsAdmin),
      isOwner: Boolean(o.isOwner ?? o.IsOwner),
    }
  })
}

export type AdminUserDto = {
  id: number
  username: string
  email: string
  isAdmin: boolean
  isOwner: boolean
}

export type FetchAdminUsersResult = {
  items: AdminUserDto[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
}

export async function fetchAdminUsersPage(
  page: number,
  accessToken: string,
  pageSize = PAGE_SIZE,
): Promise<FetchAdminUsersResult> {
  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/users`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to load users (${res.status})`)
  }

  const raw = (await res.json()) as unknown
  const items = normalizeAdminUsers(raw)
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

export type FetchAdminTagsResult = Omit<FetchAdminUsersResult, 'items'> & { items: TagDto[] }

export async function fetchAdminTagsPage(
  page: number,
  accessToken: string,
  pageSize = 100,
): Promise<FetchAdminTagsResult> {
  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/tags`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to load tags (${res.status})`)
  }

  const items = (await res.json()) as TagDto[]
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

export async function createAdminTag(name: string, accessToken: string): Promise<TagDto> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not create tag (${res.status})`)
  }
  return (await res.json()) as TagDto
}

export async function updateAdminTag(id: number, name: string, accessToken: string): Promise<TagDto> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/tags/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not update tag (${res.status})`)
  }
  return (await res.json()) as TagDto
}

export async function deleteAdminTag(id: number, accessToken: string): Promise<void> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/tags/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not delete tag (${res.status})`)
  }
}

export async function promoteUserToAdmin(userId: number, accessToken: string): Promise<void> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/users/${userId}/admin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not grant admin (${res.status})`)
  }
}

export async function deleteAdminUser(userId: number, accessToken: string): Promise<void> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Could not delete user (${res.status})`)
  }
}
