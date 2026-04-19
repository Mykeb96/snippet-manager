import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import { fetchSnippetsPage, PAGE_SIZE, type SnippetDto } from '../api/snippets'
import { formatFeedTime } from '../utils/formatFeedTime'

export default function HomePage() {
  const [snippets, setSnippets] = useState<SnippetDto[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextPage, setNextPage] = useState(1)

  const loadingLockRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('typescript')

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      loadingLockRef.current = true
      setLoadError(null)
      try {
        const result = await fetchSnippetsPage(1, PAGE_SIZE)
        if (cancelled) return
        setSnippets(result.items)
        setHasMore(result.hasMore)
        setNextPage(result.page + 1)
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : 'Something went wrong.'
        setLoadError(message)
      } finally {
        if (!cancelled) {
          loadingLockRef.current = false
          setInitialLoading(false)
        }
      }
    }

    void initialLoad()
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingLockRef.current || loadingMore || !hasMore) return

    loadingLockRef.current = true
    setLoadingMore(true)
    setLoadError(null)

    try {
      const result = await fetchSnippetsPage(nextPage, PAGE_SIZE)
      setSnippets((prev) => [...prev, ...result.items])
      setHasMore(result.hasMore)
      setNextPage(result.page + 1)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      setLoadError(message)
    } finally {
      loadingLockRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, nextPage, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        if (initialLoading) return
        void loadMore()
      },
      { root: null, rootMargin: '240px', threshold: 0 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [initialLoading, loadMore])

  async function retryInitial() {
    loadingLockRef.current = true
    setInitialLoading(true)
    setLoadError(null)
    try {
      const result = await fetchSnippetsPage(1, PAGE_SIZE)
      setSnippets(result.items)
      setHasMore(result.hasMore)
      setNextPage(result.page + 1)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      setLoadError(message)
    } finally {
      loadingLockRef.current = false
      setInitialLoading(false)
    }
  }

  function handlePostSnippet(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const c = code.trim()
    if (!t || !c) return

    const optimistic: SnippetDto = {
      id: -Date.now(),
      title: t,
      code: c,
      language: language.trim() || 'text',
      createdAt: new Date().toISOString(),
      userId: 0,
      user: { id: 0, username: 'you' },
    }
    setSnippets((prev) => [optimistic, ...prev])
    setTitle('')
    setCode('')
  }

  const canPost = title.trim().length > 0 && code.trim().length > 0

  return (
    <div id="feed" className="feed-layout section-anchor">
      <form className="compose" onSubmit={handlePostSnippet} aria-label="Create snippet">
        <div className="compose__avatar" aria-hidden="true">
          <span className="compose__avatar-inner">U</span>
        </div>
        <div className="compose__fields">
          <input
            className="compose__title"
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            autoComplete="off"
          />
          <textarea
            className="compose__code"
            placeholder="Paste or write your snippet…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={5}
            spellCheck={false}
          />
          <div className="compose__toolbar">
            <label className="compose__lang-label">
              <span className="visually-hidden">Language</span>
              <select
                className="compose__lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="csharp">C#</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
                <option value="text">Plain text</option>
              </select>
            </label>
            <button type="submit" className="btn btn--primary compose__submit" disabled={!canPost}>
              Post
            </button>
          </div>
        </div>
      </form>

      {loadError && !initialLoading && (
        <div className="feed-banner feed-banner--error" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setLoadError(null)
              if (snippets.length === 0) void retryInitial()
              else void loadMore()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {initialLoading && snippets.length === 0 && (
        <div className="feed-status feed-status--initial" aria-busy="true">
          Loading snippets…
        </div>
      )}

      {!initialLoading && snippets.length === 0 && !loadError && (
        <div className="feed-empty">No snippets yet. Be the first to post.</div>
      )}

      <ul className="feed-list" aria-label="Snippets timeline">
        {snippets.map((s) => (
          <li key={s.id}>
            <article className="snippet-card">
              <div className="snippet-card__avatar" aria-hidden="true">
                {s.user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="snippet-card__body">
                <header className="snippet-card__meta">
                  <span className="snippet-card__name">@{s.user.username}</span>
                  <span className="snippet-card__dot" aria-hidden="true">
                    ·
                  </span>
                  <time className="snippet-card__time" dateTime={s.createdAt}>
                    {formatFeedTime(s.createdAt)}
                  </time>
                </header>
                <h3 className="snippet-card__title">{s.title}</h3>
                <pre className="snippet-card__code-wrap">
                  <code className="snippet-card__code">{s.code}</code>
                </pre>
                <footer className="snippet-card__footer">
                  <span className="snippet-card__lang">{s.language}</span>
                </footer>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />

      {loadingMore && (
        <div className="feed-status feed-status--more" aria-busy="true">
          Loading more…
        </div>
      )}

      {!hasMore && snippets.length > 0 && !loadError && (
        <p className="feed-end">You&apos;re up to date.</p>
      )}
    </div>
  )
}
