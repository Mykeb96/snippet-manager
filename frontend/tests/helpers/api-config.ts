/// <reference types="node" />

/**
 * Base URL for Playwright API calls (login, snippets, admin users, etc.).
 * Override with PLAYWRIGHT_API_URL in CI or when the API is not on the default port.
 */
const raw = process.env.PLAYWRIGHT_API_URL?.trim()
export const API_URL =
  raw && raw.length > 0 ? raw.replace(/\/$/, '') : 'http://localhost:5090'
