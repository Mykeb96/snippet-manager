import { useCallback, useEffect, useState } from 'react'
import { fetchMySnippetsPage, isRealSnippetApiEnabled, PAGE_SIZE, type SnippetDto } from '../../api/snippets'
import { useAuth } from '../../hooks/useAuth'
import { formatFeedTime } from '../../utils/formatFeedTime'
import { formatTagDisplayName } from '../../utils/formatTagDisplayName'
import { SnippetCopyButton } from '../../components/SnippetCopyButton'

export default function MySnippetsPage() {
  const { user, token } = useAuth()
  const [items, setItems] = useState<SnippetDto[]>([])
  const [lastLoadedPage, setLastLoadedPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (!user || !token) return
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await fetchMySnippetsPage(pageToFetch, PAGE_SIZE, token)
        if (append) {
          setItems((prev) => [...prev, ...result.items])
        } else {
          setItems(result.items)
        }
        setLastLoadedPage(result.page)
        setHasMore(result.hasMore)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load snippets.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [user, token],
  )

  useEffect(() => {
    if (!user || !token) return
    void fetchPage(1, false)
  }, [user, token, fetchPage])

  if (!user) return null

  if (!token) {
    return (
      <section className="profile-panel profile-my-snippets" aria-labelledby="profile-my-snippets-heading">
        <h2 id="profile-my-snippets-heading" className="profile-panel__heading">
          My snippets
        </h2>
        <p className="profile-panel__muted">Sign in again to load your snippets.</p>
      </section>
    )
  }

  return (
    <section className="profile-panel profile-my-snippets" aria-labelledby="profile-my-snippets-heading">
      <h2 id="profile-my-snippets-heading" className="profile-panel__heading">
        My snippets
      </h2>

      {!isRealSnippetApiEnabled() && (
        <p className="profile-panel__lede">
          You&apos;re using the <strong>mock feed</strong> (<code className="profile-panel__code">VITE_USE_MOCK_FEED</code>
          ). Snippets aren&apos;t stored on the server. Remove that env var and run the API to save posts and see them
          here.
        </p>
      )}

      {isRealSnippetApiEnabled() && (
        <p className="profile-panel__lede">Everything you&apos;ve posted from the home feed.</p>
      )}

      {error && (
        <div className="profile-panel__error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void fetchPage(1, false)}>
            Retry
          </button>
        </div>
      )}

      {loading && items.length === 0 && (
        <p className="profile-panel__muted" aria-busy="true">
          Loading…
        </p>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="profile-panel__muted">No snippets yet. Post something from the home feed.</p>
      )}

      {items.length > 0 && (
        <ul className="profile-my-snippets__list" aria-label="Your snippets">
          {items.map((s) => (
            <li key={s.id}>
              <article className="snippet-card snippet-card--profile">
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
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="profile-my-snippets__more">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={loadingMore}
            onClick={() => void fetchPage(lastLoadedPage + 1, true)}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  )
}
