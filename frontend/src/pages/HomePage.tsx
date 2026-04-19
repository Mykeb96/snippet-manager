import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  fetchSnippetsPage,
  createSnippet,
  deleteSnippet,
  PAGE_SIZE,
  isRealSnippetApiEnabled,
  type SnippetDto,
  type TagDto,
} from '../api/snippets'
import { fetchTagsForCompose } from '../api/tags'
import {
  fetchMyFavoriteSnippetIds,
  addFavorite,
  removeFavorite,
  saveMockFavoriteIds,
  loadMockFavoriteIds,
} from '../api/favorites'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastProvider'
import { formatFeedTime } from '../utils/formatFeedTime'
import { formatTagDisplayName } from '../utils/formatTagDisplayName'
import { SnippetCopyButton } from '../components/SnippetCopyButton'
import { SnippetDeleteButton } from '../components/SnippetDeleteButton'
import { confirmDeleteSnippet } from '../utils/confirmDeleteSnippet'
import { canDeleteSnippet } from '../utils/snippetPermissions'
import { SNIPPET_MAX_CODE_LENGTH, SNIPPET_MAX_TITLE_LENGTH } from '../constants/snippetLimits'

export default function HomePage() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [snippets, setSnippets] = useState<SnippetDto[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextPage, setNextPage] = useState(1)

  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(() => new Set())
  const [favoritingId, setFavoritingId] = useState<number | null>(null)
  const [deletingSnippetId, setDeletingSnippetId] = useState<number | null>(null)

  const loadingLockRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [tagOptions, setTagOptions] = useState<TagDto[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTagOptions([])
      return
    }
    let cancelled = false
    void fetchTagsForCompose()
      .then((tags) => {
        if (!cancelled) setTagOptions(tags)
      })
      .catch(() => {
        if (!cancelled) setTagOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setFavoritedIds(new Set())
      return
    }
    let cancelled = false
    void (async () => {
      try {
        if (!isRealSnippetApiEnabled()) {
          if (!cancelled) setFavoritedIds(loadMockFavoriteIds())
          return
        }
        if (!token) {
          if (!cancelled) setFavoritedIds(new Set())
          return
        }
        const ids = await fetchMyFavoriteSnippetIds(token)
        if (!cancelled) setFavoritedIds(ids)
      } catch {
        if (!cancelled) setFavoritedIds(new Set())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, token])

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

  const filteredTagOptions = useMemo(() => {
    const q = tagFilter.trim().toLowerCase()
    if (!q) return tagOptions
    return tagOptions.filter((t) => {
      const slug = t.name.toLowerCase()
      const label = formatTagDisplayName(t.name).toLowerCase()
      return slug.includes(q) || label.includes(q)
    })
  }, [tagOptions, tagFilter])

  function toggleComposeTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort((a, b) => a - b),
    )
  }

  function goToAuth() {
    const returnTo = `${location.pathname}${location.search}`
    navigate({
      pathname: '/auth',
      search: returnTo && returnTo !== '/' ? `returnTo=${encodeURIComponent(returnTo)}` : '',
    })
  }

  async function handleDeleteSnippet(s: SnippetDto) {
    if (!canDeleteSnippet(user, s, isRealSnippetApiEnabled(), token)) return
    const ok = await confirmDeleteSnippet(s.title)
    if (!ok) return
    if (!isRealSnippetApiEnabled()) {
      setSnippets((prev) => prev.filter((x) => x.id !== s.id))
      showToast('Snippet removed from the feed.')
      return
    }
    if (!token || s.id <= 0) return
    setDeletingSnippetId(s.id)
    setLoadError(null)
    try {
      await deleteSnippet(s.id, token)
      setSnippets((prev) => prev.filter((x) => x.id !== s.id))
      setFavoritedIds((prev) => {
        const next = new Set(prev)
        next.delete(s.id)
        return next
      })
      showToast('Snippet deleted.')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not delete snippet.'
      setLoadError(message)
    } finally {
      setDeletingSnippetId(null)
    }
  }

  async function toggleFavorite(snippetId: number) {
    if (!user) {
      goToAuth()
      return
    }
    if (snippetId <= 0 || favoritingId !== null) return

    const isFav = favoritedIds.has(snippetId)

    if (!isRealSnippetApiEnabled()) {
      const next = new Set(favoritedIds)
      if (isFav) next.delete(snippetId)
      else next.add(snippetId)
      setFavoritedIds(next)
      saveMockFavoriteIds(next)
      return
    }

    if (!token) return

    setFavoritingId(snippetId)
    try {
      if (isFav) {
        await removeFavorite(snippetId, token)
      } else {
        await addFavorite(snippetId, token)
      }
      setFavoritedIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.delete(snippetId)
        else next.add(snippetId)
        return next
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update favorite.'
      setLoadError(message)
    } finally {
      setFavoritingId(null)
    }
  }

  async function handlePostSnippet(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    const t = title.trim()
    const c = code.trim()
    if (!t || !c) return

    if (code.length > SNIPPET_MAX_CODE_LENGTH) {
      setComposeError(`Code must be at most ${SNIPPET_MAX_CODE_LENGTH.toLocaleString()} characters.`)
      return
    }

    const tagObjects = tagOptions.filter((tag) => selectedTagIds.includes(tag.id))
    const tagIds = selectedTagIds.length > 0 ? selectedTagIds : undefined

    setComposeError(null)

    if (isRealSnippetApiEnabled() && token) {
      try {
        const created = await createSnippet(
          {
            title: t,
            code: c,
            language: language.trim() || 'text',
            tagIds,
          },
          token,
        )
        setSnippets((prev) => [created, ...prev])
        setTitle('')
        setCode('')
        setSelectedTagIds([])
        showToast('Snippet posted successfully.')
      } catch (err) {
        setComposeError(err instanceof Error ? err.message : 'Could not post snippet.')
      }
      return
    }

    const optimistic: SnippetDto = {
      id: -Date.now(),
      title: t,
      code: c,
      language: language.trim() || 'text',
      createdAt: new Date().toISOString(),
      userId: user.userId,
      user: { id: user.userId, username: user.username },
      tags: tagObjects,
    }
    setSnippets((prev) => [optimistic, ...prev])
    setTitle('')
    setCode('')
    setSelectedTagIds([])
    showToast('Snippet posted (demo session — not saved on the server).', { durationMs: 4800 })
  }

  const canPost = title.trim().length > 0 && code.trim().length > 0

  return (
    <div id="feed" className="feed-layout section-anchor">
      {user && (
        <form className="compose" onSubmit={(e) => void handlePostSnippet(e)} aria-label="Create snippet">
          <div className="compose__avatar" aria-hidden="true">
            <span className="compose__avatar-inner">{user.username.slice(0, 1).toUpperCase()}</span>
          </div>
          <div className="compose__fields">
            {!isRealSnippetApiEnabled() && (
              <p className="compose__demo-notice">
                Demo feed: posts stay in this browser session only. Unset{' '}
                <code className="compose__demo-code">VITE_USE_MOCK_FEED</code> and run the API to save snippets to the
                database.
              </p>
            )}
            {composeError && (
              <div className="compose__error" role="alert">
                {composeError}
              </div>
            )}
            <input
              className="compose__title"
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={SNIPPET_MAX_TITLE_LENGTH}
              autoComplete="off"
            />
            <textarea
              className="compose__code"
              placeholder="Paste or write your snippet…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={SNIPPET_MAX_CODE_LENGTH}
              rows={5}
              spellCheck={false}
            />
            {tagOptions.length > 0 && (
              <fieldset className="compose__tags">
                <legend className="compose__tags-legend">Tags</legend>
                <p className="compose__tags-hint">
                  Frameworks and topics (e.g. React, Next.js)
                </p>
                <label htmlFor="compose-tag-filter" className="visually-hidden">
                  Filter tags
                </label>
                <input
                  id="compose-tag-filter"
                  type="search"
                  className="compose__tags-filter"
                  placeholder="Filter tags…"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  autoComplete="off"
                />
                <div className="compose__tags-scroll">
                  <div className="compose__tags-grid">
                    {filteredTagOptions.map((tag) => (
                      <label key={tag.id} className="compose__tag-option">
                        <input
                          type="checkbox"
                          className="compose__tag-input"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={() => toggleComposeTag(tag.id)}
                        />
                        <span className="compose__tag-text">{formatTagDisplayName(tag.name)}</span>
                      </label>
                    ))}
                  </div>
                  {filteredTagOptions.length === 0 && (
                    <p className="compose__tags-empty" role="status">
                      No tags match your filter.
                    </p>
                  )}
                </div>
              </fieldset>
            )}
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
      )}

      {!user && (
        <div className="feed-guest-banner">
          <p>
            <button type="button" className="feed-guest-banner__link" onClick={goToAuth}>
              Sign in
            </button>{' '}
            to post snippets and save favorites. You can still browse the feed.
          </p>
        </div>
      )}

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
        <div className="feed-empty">
          {user ? 'No snippets yet. Be the first to post.' : 'No snippets yet.'}
        </div>
      )}

      <ul className="feed-list" aria-label="Snippets timeline">
        {snippets.map((s) => {
          const favorited = favoritedIds.has(s.id)
          const canToggleFav = s.id > 0
          const showDelete = canDeleteSnippet(user, s, isRealSnippetApiEnabled(), token)
          return (
            <li key={s.id}>
              <article className="snippet-card">
                <div className="snippet-card__avatar" aria-hidden="true">
                  {s.user.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="snippet-card__body">
                  <div className="snippet-card__head">
                    <div className="snippet-card__head-main">
                      <header className="snippet-card__meta">
                        <span className="snippet-card__name">@{s.user.username}</span>
                        <span className="snippet-card__dot" aria-hidden="true">
                          ·
                        </span>
                        <time className="snippet-card__time" dateTime={s.createdAt}>
                          {formatFeedTime(s.createdAt)}
                        </time>
                      </header>
                    </div>
                    <div className="snippet-card__actions">
                      <SnippetCopyButton code={s.code} />
                      {showDelete && (
                        <SnippetDeleteButton
                          disabled={deletingSnippetId === s.id}
                          onClick={() => void handleDeleteSnippet(s)}
                        />
                      )}
                      <button
                        type="button"
                        className={[
                          'snippet-card__fav',
                          favorited ? 'snippet-card__fav--on' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={!canToggleFav || favoritingId === s.id || deletingSnippetId === s.id}
                        aria-pressed={favorited}
                        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        title={!user ? 'Sign in to save favorites' : favorited ? 'Remove favorite' : 'Favorite'}
                        onClick={() => void toggleFavorite(s.id)}
                      >
                        <span className="snippet-card__fav-icon" aria-hidden="true">
                          {favorited ? '♥' : '♡'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <h3 className="snippet-card__title">{s.title}</h3>
                  <pre className="snippet-card__code-wrap">
                    <code className="snippet-card__code">{s.code}</code>
                  </pre>
                  <footer className="snippet-card__footer">
                    {(s.tags?.length ?? 0) > 0 && (
                      <ul className="snippet-card__tags" aria-label="Tags">
                        {(s.tags ?? []).map((tag) => (
                          <li key={tag.id}>
                            <span className="snippet-card__tag">{formatTagDisplayName(tag.name)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="snippet-card__lang">{s.language}</span>
                  </footer>
                </div>
              </article>
            </li>
          )
        })}
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
