export default function MySnippetsPage() {
  return (
    <section className="profile-panel" aria-labelledby="profile-my-snippets-heading">
      <h2 id="profile-my-snippets-heading" className="profile-panel__heading">
        My snippets
      </h2>
      <p className="profile-panel__lede">
        Snippets you&apos;ve posted will appear here. This list will connect to your account once the API is wired up.
      </p>
      <p className="profile-panel__muted">No snippets to show yet.</p>
    </section>
  )
}
