import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { API_URL } from './api-config'

export async function apiCreateSnippet(
  request: APIRequestContext,
  accessToken: string,
  input: { title: string; code: string; language?: string },
): Promise<{ id: number }> {
  const res = await request.post(`${API_URL}/api/snippets`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      title: input.title,
      code: input.code,
      language: input.language ?? 'text',
    },
  })
  if (!res.ok()) {
    throw new Error(`apiCreateSnippet failed: ${res.status()} ${await res.text()}`)
  }
  return (await res.json()) as { id: number }
}

export async function apiDeleteSnippet(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  const res = await request.delete(`${API_URL}/api/snippets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`apiDeleteSnippet failed: ${res.status()} ${await res.text()}`)
  }
}

export async function createSnippetViaUi(
  page: Page,
  opts: { title: string; code: string },
): Promise<{ id: number; snippet: Locator }> {
  const form = page.getByRole('form', { name: 'Create snippet' })
  await form.getByRole('textbox', { name: 'Title' }).fill(opts.title)
  await form.getByPlaceholder('Paste or write your snippet…').fill(opts.code)

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      /\/api\/snippets\/?$/.test(new URL(res.url()).pathname),
  )
  await form.getByRole('button', { name: 'Post' }).click()
  const res = await createResponsePromise
  const { id } = (await res.json()) as { id: number }

  const snippet = page
    .getByRole('list', { name: 'Snippets timeline' })
    .getByRole('listitem')
    .filter({ hasText: opts.title })

  await expect(snippet).toBeVisible()
  await expect(snippet.getByRole('heading', { name: opts.title })).toBeVisible()

  return { id, snippet }
}
