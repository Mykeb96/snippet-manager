import { useCallback, useEffect, useRef, useState } from 'react'

type SnippetCopyButtonProps = {
  code: string
}

export function SnippetCopyButton({ code }: SnippetCopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current)
    },
    [],
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* denied or unavailable */
    }
  }, [code])

  return (
    <button
      type="button"
      className={['snippet-card__copy', copied ? 'snippet-card__copy--done' : ''].filter(Boolean).join(' ')}
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg className="snippet-card__copy-svg" viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
          <path
            fill="currentColor"
            d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
          />
        </svg>
      ) : (
        <svg
          className="snippet-card__copy-svg"
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}
