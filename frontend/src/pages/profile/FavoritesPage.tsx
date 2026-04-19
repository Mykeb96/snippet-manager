export default function FavoritesPage() {
  return (
    <section className="profile-panel" aria-labelledby="profile-favorites-heading">
      <h2 id="profile-favorites-heading" className="profile-panel__heading">
        Favorites
      </h2>
      <p className="profile-panel__lede">
        Snippets you&apos;ve favorited from the feed will appear here when this view is wired to the API.
      </p>
      <p className="profile-panel__muted">You haven&apos;t favorited anything yet.</p>
    </section>
  )
}
