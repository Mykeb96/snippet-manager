const FAQ_ITEMS = [
  {
    question: 'What is Snippet manager?',
    answer:
      'Snippet manager is a place to save, organize, and browse short pieces of code—like a timeline for snippets you care about. You can post from the home feed and revisit your work from your profile as we connect more features.',
  },
  {
    question: 'How does the home feed work?',
    answer:
      'The feed shows snippets in reverse chronological order. As you scroll, more load automatically (infinite scroll), similar to social timelines. What you see today may use demo data until your account is hooked up to the live API.',
  },
  {
    question: 'Can I edit or delete a snippet after posting?',
    answer:
      'Editing and deleting from the UI are on the roadmap. Once the backend exposes those endpoints, you’ll be able to update or remove snippets from “My snippets” on your profile.',
  },
  {
    question: 'Where are my snippets stored?',
    answer:
      'When you use the real API, snippets are stored in the app’s database on the server you configure. In local development you might see mock data in the browser so you can test the feed without running the API.',
  },
  {
    question: 'How will I change my password?',
    answer:
      'Go to Profile → Settings. Password changes will be available once authentication is wired to the backend; the Settings page is already set up as the home for account security options.',
  },
  {
    question: 'Can other people see my snippets?',
    answer:
      'Sharing and visibility rules will follow your product settings. For now, treat posts as visible where the feed is visible; private or follower-only modes can be added when user accounts and permissions are implemented.',
  },
] as const

export default function FaqPage() {
  return (
    <div className="faq-page">
      <header className="faq-page__header">
        <h1 className="faq-page__title">Frequently asked questions</h1>
        <p className="faq-page__intro">
          Quick answers about Snippet manager. We’ll expand this as features ship.
        </p>
      </header>

      <div className="faq-page__body">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="faq-item">
            <h2 className="faq-item__question">{item.question}</h2>
            <p className="faq-item__answer">{item.answer}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
