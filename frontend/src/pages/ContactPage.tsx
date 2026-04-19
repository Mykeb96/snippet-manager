import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const GITHUB = 'https://github.com/Mykeb96'
const LINKEDIN = 'https://www.linkedin.com/in/mykael-barnes/'
const EMAIL = 'mykael.barnes@hotmail.com'

const README_FALLBACK = `# Hi, I'm Mykael 👋

I'm a full-stack developer focused on building practical web apps using **React** and modern back-end stacks.

I like working end-to-end—APIs, databases, and front-end—making sure everything feels clean, fast, and easy to work with. I put a lot of emphasis on code quality and maintainability, especially when working on teams.

## Tech Stack

- **Frontend:** React, Next.js, JavaScript, TypeScript, HTML, CSS
- **Backend:** Node.js, Express, PHP (Laravel), NestJS, ASP.NET Core Web API (.NET 10)
- **Databases:** PostgreSQL, MySQL
- **Backend Tools:** Prisma
- **Infrastructure & Tools:** Git, GitHub, GitLab, Docker, Redis, Azure, AWS, CI/CD

## Featured Projects

Check out pinned repositories on [my GitHub profile](${GITHUB}) for full-stack apps, REST APIs with JWT, Vite/React front ends, and API integration tests.
`

type GitHubProfile = {
  name: string | null
  login: string
  avatarUrl: string
  bio: string | null
  htmlUrl: string
}

async function fetchGitHubProfile(): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/users/Mykeb96')
  if (!res.ok) throw new Error('GitHub profile request failed')
  const data = (await res.json()) as {
    name: string | null
    login: string
    avatar_url: string
    bio: string | null
    html_url: string
  }
  return {
    name: data.name,
    login: data.login,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    htmlUrl: data.html_url,
  }
}

async function fetchProfileReadme(): Promise<string> {
  const res = await fetch('https://api.github.com/repos/Mykeb96/Mykeb96/readme', {
    headers: { Accept: 'application/vnd.github.raw' },
  })
  if (!res.ok) throw new Error('README request failed')
  return res.text()
}

export default function ContactPage() {
  const [profile, setProfile] = useState<GitHubProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [readme, setReadme] = useState<string | null>(null)
  const [readmeError, setReadmeError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const p = await fetchGitHubProfile()
        if (!cancelled) setProfile(p)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }

    async function loadReadme() {
      try {
        const raw = await fetchProfileReadme()
        if (!cancelled) {
          setReadme(raw)
          setReadmeError(false)
        }
      } catch {
        if (!cancelled) {
          setReadme(README_FALLBACK)
          setReadmeError(true)
        }
      }
    }

    void loadProfile()
    void loadReadme()
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = profile?.name ?? 'Mykael Barnes'
  const handle = profile?.login ?? 'Mykeb96'
  const avatarSrc = profile?.avatarUrl
  const bio =
    profile?.bio ??
    'Full-stack developer — React, TypeScript, ASP.NET Core, and everything in between.'

  return (
    <div className="contact-page">
      <header className="contact-page__header">
        <h1 className="contact-page__title">Contact</h1>
        <p className="contact-page__intro">
          Reach out or follow along — GitHub README loads live when the API is available.
        </p>
      </header>

      <div className="contact-page__body">
        <section className="contact-hero" aria-labelledby="contact-hero-heading">
          <h2 id="contact-hero-heading" className="visually-hidden">
            Profile
          </h2>
          <div className="contact-hero__main">
            {profileLoading ? (
              <div className="contact-hero__avatar contact-hero__avatar--skeleton" aria-hidden="true" />
            ) : avatarSrc ? (
              <img
                className="contact-hero__avatar"
                src={avatarSrc}
                alt={`${displayName} on GitHub`}
                width={112}
                height={112}
              />
            ) : (
              <div className="contact-hero__avatar contact-hero__avatar--fallback" aria-hidden="true">
                MB
              </div>
            )}
            <div className="contact-hero__text">
              <p className="contact-hero__name">{profileLoading ? '…' : displayName}</p>
              <p className="contact-hero__handle">
                <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                  @{handle}
                </a>
              </p>
              <p className="contact-hero__bio">{profileLoading ? 'Loading profile…' : bio}</p>
            </div>
          </div>

          <ul className="contact-links" aria-label="Contact and social links">
            <li>
              <a className="contact-link" href={GITHUB} target="_blank" rel="noopener noreferrer">
                <span className="contact-link__label">GitHub</span>
                <span className="contact-link__meta">github.com/Mykeb96</span>
              </a>
            </li>
            <li>
              <a className="contact-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                <span className="contact-link__label">LinkedIn</span>
                <span className="contact-link__meta">mykael-barnes</span>
              </a>
            </li>
            <li>
              <a className="contact-link" href={`mailto:${EMAIL}`}>
                <span className="contact-link__label">Email</span>
                <span className="contact-link__meta">{EMAIL}</span>
              </a>
            </li>
          </ul>
        </section>

        <section className="contact-readme" aria-labelledby="contact-readme-heading">
          <div className="contact-readme__head">
            <h2 id="contact-readme-heading" className="contact-readme__title">
              Mykeb96 / README
            </h2>
            {readmeError && (
              <p className="contact-readme__note">Showing a saved copy — live README could not be loaded.</p>
            )}
          </div>
          <div className="contact-readme__md">
            {readme == null ? (
              <p className="contact-readme__loading">Loading README…</p>
            ) : (
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {readme}
              </ReactMarkdown>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
