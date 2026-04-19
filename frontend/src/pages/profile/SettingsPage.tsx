export default function SettingsPage() {
  return (
    <section className="profile-panel" aria-labelledby="profile-settings-heading">
      <h2 id="profile-settings-heading" className="profile-panel__heading">
        Settings
      </h2>
      <p className="profile-panel__lede">Account and security preferences.</p>

      <div className="settings-block">
        <h3 className="settings-block__title">Password</h3>
        <p className="settings-block__text">
          You&apos;re signed in with your account. Password changes will be available when the API exposes that
          endpoint.
        </p>
        <button type="button" className="btn btn--primary" disabled>
          Change password
        </button>
      </div>
    </section>
  )
}
