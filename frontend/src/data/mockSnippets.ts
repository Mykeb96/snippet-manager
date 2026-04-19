import type { FetchSnippetsPageResult, SnippetDto, TagDto } from '../api/snippets'
import { MOCK_TAGS } from './mockTags'

const MOCK_USER_POOL = [
  { id: 1, username: 'devguru' },
  { id: 2, username: 'byte_wanderer' },
  { id: 3, username: 'nullpointer' },
  { id: 4, username: 'async_await' },
  { id: 5, username: 'stack_smash' },
  { id: 6, username: 'lambda_fan' },
  { id: 7, username: 'refactor_ninja' },
  { id: 8, username: 'typesafe' },
  { id: 9, username: 'rustacean' },
  { id: 10, username: 'gopher' },
  { id: 11, username: 'py_dev' },
  { id: 12, username: 'sql_slinger' },
  { id: 13, username: 'css_wizard' },
  { id: 14, username: 'react_bits' },
  { id: 15, username: 'dotnet_core' },
] as const

const LANGS = ['typescript', 'javascript', 'python', 'csharp', 'sql', 'rust', 'go', 'text'] as const

const TITLE_STEMS = [
  'Debounce',
  'Memoized selector',
  'Parse env safely',
  'Retry with backoff',
  'Idempotency key',
  'Cursor pagination',
  'Deep merge objects',
  'Group by key',
  'Chunk array',
  'Sleep promise',
  'Once function',
  'Pick & omit',
  'URL builder',
  'Slugify',
  'Truncate middle',
  'Format bytes',
  'Relative time',
  'Escape HTML',
  'Hash string',
  'UUID v4',
  'Deep clone lite',
  'Is plain object',
  'Assert never',
  'Branded type',
  'Result type',
  'Mutex async',
  'Queue worker',
  'LRU cache',
  'Trie insert',
  'Binary search',
  'Topo sort',
  'Event emitter',
  'Observable lite',
  'Pipe helpers',
  'Match exhaustive',
  'Zod refine',
  'EF Core filter',
  'Raw SQL guard',
  'Index hint',
  'Migration stub',
] as const

function buildSnippetBody(i: number, lang: string): string {
  const n = i + 1
  switch (lang) {
    case 'typescript':
      return `// Snippet #${n}\nexport function snippet_${n}<T>(x: T): T {\n  console.debug('mock', ${n});\n  return x;\n}\n`
    case 'javascript':
      return `// Snippet #${n}\nexport const run_${n} = () => ({ id: ${n}, ok: true });\n`
    case 'python':
      return `# Snippet ${n}\ndef snippet_${n}(x: int) -> int:\n    return x + ${n % 7}\n`
    case 'csharp':
      return `// Snippet ${n}\npublic static class Snippet${n} {\n  public static int Run() => ${n % 99};\n}\n`
    case 'sql':
      return `-- Snippet ${n}\nSELECT ${n} AS id, 'mock' AS source\nWHERE EXISTS (SELECT 1);\n`
    case 'rust':
      return `// Snippet ${n}\npub fn snippet_${n}(x: i32) -> i32 {\n    x.saturating_add(${n % 5})\n}\n`
    case 'go':
      return `// Snippet ${n}\npackage mock\nfunc Snippet${n}(x int) int { return x + ${n % 11} }\n`
    default:
      return `Snippet ${n}\nPlain text line one.\nLine two for scrolling tests.\n`
  }
}

/** 2–4 tags per snippet so feed cards always show realistic chip styling. */
function tagsForIndex(i: number): TagDto[] {
  const count = 2 + (i % 3)
  const start = (i * 5) % MOCK_TAGS.length
  const out: TagDto[] = []
  for (let k = 0; k < count; k++) {
    const t = MOCK_TAGS[(start + k) % MOCK_TAGS.length]
    if (!out.some((x) => x.id === t.id)) out.push(t)
  }
  return out.length >= 2 ? out : [MOCK_TAGS[0], MOCK_TAGS[1]]
}

function buildAllMockSnippets(count: number): SnippetDto[] {
  return Array.from({ length: count }, (_, i) => {
    const user = MOCK_USER_POOL[i % MOCK_USER_POOL.length]
    const lang = LANGS[i % LANGS.length]
    const titleStem = TITLE_STEMS[i % TITLE_STEMS.length]
    const minutesAgo = i * 3 + (i % 17)
    const created = new Date(Date.now() - minutesAgo * 60_000)

    return {
      id: i + 1,
      title: `${titleStem} · #${i + 1}`,
      code: buildSnippetBody(i, lang),
      language: lang,
      createdAt: created.toISOString(),
      userId: user.id,
      user: { id: user.id, username: user.username },
      tags: tagsForIndex(i),
    }
  })
}

/** Large pool for infinite-scroll testing without the API. */
const MOCK_SNIPPET_POOL = buildAllMockSnippets(420)

const MOCK_LATENCY_MS = 280

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simulates GET /api/snippets pagination (same shape as the real client). */
export async function fetchMockSnippetsPage(page: number, pageSize: number): Promise<FetchSnippetsPageResult> {
  await delay(MOCK_LATENCY_MS)

  const totalCount = MOCK_SNIPPET_POOL.length
  const start = (page - 1) * pageSize
  const items = MOCK_SNIPPET_POOL.slice(start, start + pageSize)
  const hasMore = start + items.length < totalCount

  return {
    items,
    page,
    pageSize,
    totalCount,
    hasMore,
  }
}

export const MOCK_SNIPPET_COUNT = MOCK_SNIPPET_POOL.length
