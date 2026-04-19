import { getApiBaseUrl, isRealSnippetApiEnabled } from './snippets'
import type { TagDto } from './snippets'
import { MOCK_TAGS } from '../data/mockTags'

/** Tags for the compose UI (first page, high page size). */
export async function fetchTagsForCompose(): Promise<TagDto[]> {
  if (!isRealSnippetApiEnabled()) {
    return MOCK_TAGS
  }

  const base = getApiBaseUrl()
  const url = new URL(`${base}/api/tags`)
  url.searchParams.set('page', '1')
  url.searchParams.set('pageSize', '100')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to load tags (${res.status})`)
  }

  return (await res.json()) as TagDto[]
}
