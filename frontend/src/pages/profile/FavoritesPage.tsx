import { useCallback, useEffect, useState } from 'react'
import {
  favoriteRowToSnippetDto,
  fetchMyFavoritesPage,
  removeFavorite,
  type FavoriteListRowDto,
} from '../../api/favorites'
import { isRealSnippetApiEnabled, PAGE_SIZE } from '../../api/snippets'
import { useAuth } from '../../hooks/useAuth'
import { formatFeedTime } from '../../utils/formatFeedTime'
import { formatTagDisplayName } from '../../utils/formatTagDisplayName'
import { SnippetCopyButton } from '../../components/SnippetCopyButton'

export default function FavoritesPage() {
  const { user, token } = useAuth()
  const [rows, setRows] = useState<FavoriteListRowDto[]>([])
  const [lastLoadedPage, setLastLoadedPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const fetchPage = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (!user || !token) return
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await fetchMyFavoritesPage(pageToFetch, PAGE_SIZE, token)
        if (append) {
          setRows((prev) => [...prev, ...result.items])
        } else {
          setRows(result.items)
        }
        setLastLoadedPage(result.page)
        setHasMore(result.hasMore)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load favorites.')
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

  async function handleUnfavorite(snippetId: number) {
    if (!token || removingId !== null) return
    setRemovingId(snippetId)
    setError(null)
    try {
      await removeFavorite(snippetId, token)
      setRows((prev) => prev.filter((r) => r.snippetId !== snippetId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove favorite.')
    } finally {
      setRemovingId(null)
    }
  }

  if (!user) return null

  if (!token) {
    return (
      <section className="profile-panel profile-favorites" aria-labelledby="profile-favorites-heading">
        <h2 id="profile-favorites-heading" className="profile-panel__heading">
          Favorites
        </h2>
        <p className="profile-panel__muted">Sign in again to see your favorites.</p>
      </section>
    )
  }

  return (
    <section className="profile-panel profile-favorites" aria-labelledby="profile-favorites-heading">
      <h2 id="profile-favorites-heading" className="profile-panel__heading">
        Favorites
      </h2>

      {!isRealSnippetApiEnabled() && (
        <p className="profile-panel__lede">
          You&apos;re using the <strong>mock feed</strong> (<code className="profile-panel__code">VITE_USE_MOCK_FEED</code>
          ). Favorites are stored in this browser session only. Use the real API to sync favorites to your account.
        </p>
      )}

      {isRealSnippetApiEnabled() && (
        <p className="profile-panel__lede">Snippets you&apos;ve saved from the home feed.</p>
      )}

      {error && (
        <div className="profile-panel__error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void fetchPage(1, false)}>
            Retry
          </button>
        </div>
      )}

      {loading && rows.length === 0 && (
        <p className="profile-panel__muted" aria-busy="true">
          Loading…
        </p>
      )}

      {!loading && rows.length === 0 && !error && (
        <p className="profile-panel__muted">No favorites yet. Heart a snippet on the home feed.</p>
      )}

      {rows.length > 0 && (
        <ul className="profile-my-snippets__list" aria-label="Your favorite snippets">
          {rows.map((row) => {
            const s = favoriteRowToSnippetDto(row)
            return (
              <li key={`${row.userId}-${row.snippetId}`}>
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
                        <button
                          type="button"
                          className="snippet-card__fav snippet-card__fav--on"
                          disabled={removingId === s.id}
                          aria-label="Remove from favorites"
                          title="Remove favorite"
                          onClick={() => void handleUnfavorite(s.id)}
                        >
                          <span className="snippet-card__fav-icon" aria-hidden="true">
                            ♥
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
