/** Matches GET /api/snippets JSON (camelCase from ASP.NET Core). */

import { fetchMockSnippetsPage } from '../data/mockSnippets'

/** Set `VITE_USE_SNIPPET_API=true` when the backend is running; otherwise the mock pool is used. */
function useRealSnippetApi(): boolean {
  return import.meta.env.VITE_USE_SNIPPET_API === 'true'
}

export type SnippetUserDto = {
  id: number
  username: string
}

export type SnippetDto = {
  id: number
  title: string
  code: string
  language: string
  createdAt: string
  userId: number
  user: SnippetUserDto
}

const DEFAULT_API = 'http://localhost:5090'
const PAGE_SIZE = 20

export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_URL
  return typeof v === 'string' && v.length > 0 ? v.replace(/\/$/, '') : DEFAULT_API
}

export type FetchSnippetsPageResult = {
  items: SnippetDto[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
}

/**
 * Fetches one page of snippets. Uses X-Total-Count / X-Page / X-Page-Size when exposed by CORS;
 * otherwise infers hasMore from whether the page is full.
 */
export async function fetchSnippetsPage(page: number, pageSize = PAGE_SIZE): Promise<FetchSnippetsPageResult> {
  if (!useRealSnippetApi()) {
    return fetchMockSnippetsPage(page, pageSize)
  }

  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/snippets`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to load snippets (${res.status})`)
  }

  const items = (await res.json()) as SnippetDto[]
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

export { PAGE_SIZE }
