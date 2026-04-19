const FAQ_ITEMS = [
  {
    question: 'What is Snippet manager?',
    answer:
      'Snippet manager is a small app for sharing and browsing code snippets in a timeline-style feed—similar to a social feed, but focused on short, labeled code posts. You can sign in, post snippets, favorite others’ posts, and manage your own content from your profile.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'You can browse the public feed without signing in. To post snippets & save favorites, you need to create an account and sign in.',
  },
  {
    question: 'How does the home feed work?',
    answer:
      'Snippets appear newest first. Scrolling toward the bottom loads more automatically (infinite scroll). The feed lists posts from everyone using the app, not just people you follow.',
  },
  {
    question: 'What does favoriting a snippet do?',
    answer:
      'Favorites are your personal saved list. Tap the heart on a snippet while signed in to add or remove it; you’ll find everything you saved under Profile → Favorites. It doesn’t change the post for anyone else—it’s just for you.',
  },
  {
    question: 'What can I do from my profile?',
    answer:
      'From Profile you can open My snippets (posts you authored), Favorites (posts you saved), and Settings (change your password). You can also remove your own posts from the feed or from those lists when you’re signed in.',
  },
] as const

export default function FaqPage() {
  return (
    <div className="faq-page">
      <header className="faq-page__header">
        <h1 className="faq-page__title">Frequently asked questions</h1>
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
