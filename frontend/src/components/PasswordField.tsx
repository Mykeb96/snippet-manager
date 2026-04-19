import { useId, useState, type ReactNode, type ChangeEvent } from 'react'

export type PasswordFieldProps = {
  label: string
  name: string
  autoComplete: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  minLength?: number
  maxLength?: number
  disabled?: boolean
  /** Shown below the input (e.g. password rules). */
  hint?: ReactNode
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

export function PasswordField({
  label,
  name,
  autoComplete,
  value,
  onChange,
  required,
  minLength,
  maxLength,
  disabled,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const reactId = useId()
  const inputId = `${name}-${reactId.replace(/:/g, '')}`

  return (
    <label className="auth-field" htmlFor={inputId}>
      <span className="auth-field__label">{label}</span>
      <div className="auth-field__password-wrap">
        <input
          id={inputId}
          className="auth-field__input auth-field__input--with-toggle"
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          spellCheck={false}
        />
        <button
          type="button"
          className="auth-field__toggle-password"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={disabled}
          tabIndex={0}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint}
    </label>
  )
}
