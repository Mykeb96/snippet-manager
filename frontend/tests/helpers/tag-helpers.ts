import type { APIRequestContext } from '@playwright/test'

import { API_URL } from './api-config'

export async function apiCreateTag(
  request: APIRequestContext,
  accessToken: string,
  name: string,
): Promise<{ id: number }> {
  const res = await request.post(`${API_URL}/api/tags`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { name },
  })
  if (!res.ok()) {
    throw new Error(`apiCreateTag failed: ${res.status()} ${await res.text()}`)
  }
  return (await res.json()) as { id: number }
}

export async function apiDeleteTag(
  request: APIRequestContext,
  accessToken: string,
  id: number,
): Promise<void> {
  const res = await request.delete(`${API_URL}/api/tags/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`apiDeleteTag failed: ${res.status()} ${await res.text()}`)
  }
}
