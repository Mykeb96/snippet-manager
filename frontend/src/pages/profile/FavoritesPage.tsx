export default function FavoritesPage() {
  return (
    <section className="profile-panel" aria-labelledby="profile-favorites-heading">
      <h2 id="profile-favorites-heading" className="profile-panel__heading">
        Favorites
      </h2>
      <p className="profile-panel__lede">
        Save snippets you want to revisit. Favorites will sync with the backend when that feature is available.
      </p>
      <p className="profile-panel__muted">You haven&apos;t favorited anything yet.</p>
    </section>
  )
}
