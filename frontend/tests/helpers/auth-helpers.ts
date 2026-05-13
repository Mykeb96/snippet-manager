import type { APIRequestContext, Page } from '@playwright/test'

import { API_URL } from './api-config'

export function makeUniqueUser() {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return {
      username: `user${id}`,
      email: `user${id}@test.com`,
    };
}

export async function apiDeleteUser(
    request: APIRequestContext,
    adminToken: string,
    userId: number
): Promise<void> {
    const res = await request.delete(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (!res.ok() && res.status() !== 404) {
        throw new Error(`apiDeleteUser failed: ${res.status()} ${await res.text()}`)
    }
}

export async function fillEmail(email: string, page: Page) {
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
}

export async function fillUsername(username: string, page: Page) {
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
}

export async function fillPassword(password: string, page: Page) {
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
}

export async function clickRegister(page: Page) {
    await page.getByRole('button', { name: 'Register' }).click();
}

export async function clickSignIn(page: Page) {
    await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signInAsAdmin(page: Page) {
    await fillEmail('admin@snippet.local', page);
    await fillPassword('MyAdmin1', page);

    await clickSignIn(page);
}

export async function signInAsUser(page: Page) {
    await fillEmail('testuser@gmail.com', page);
    await fillPassword('Password1', page);

    await clickSignIn(page);
}

type StoredAuthSnapshot = {
    userId: number
    username: string
    email: string
    accessToken: string
}

export async function getStoredAuth(page: Page): Promise<StoredAuthSnapshot> {
    const auth = await page.evaluate(() => {
        const raw = localStorage.getItem('snippet-manager.auth')
        return raw ? (JSON.parse(raw) as {
            userId: number
            username: string
            email: string
            accessToken: string
        }) : null
    })
    if (!auth) throw new Error('No auth payload in localStorage')
    return auth
}

export async function getAccessToken(page: Page): Promise<string> {
    const { accessToken } = await getStoredAuth(page)
    return accessToken
}
  
export async function apiLogin(
    request: APIRequestContext,
    email: string,
    password: string,
): Promise<string> {
    const res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email, password },
    })
    if (!res.ok()) {
        throw new Error(`apiLogin failed: ${res.status()} ${await res.text()}`)
    }
    const body = (await res.json()) as { accessToken: string }
    return body.accessToken
}

export async function apiRegister(
    request: APIRequestContext,
    input: { username: string; email: string; password: string },
): Promise<{ userId: number }> {
    const res = await request.post(`${API_URL}/api/auth/register`, {
        data: {
            username: input.username,
            email: input.email,
            password: input.password,
        },
    })
    if (!res.ok()) {
        throw new Error(`apiRegister failed: ${res.status()} ${await res.text()}`)
    }
    const body = (await res.json()) as { userId?: number; UserId?: number }
    const userId = body.userId ?? body.UserId
    if (userId == null || Number.isNaN(userId)) {
        throw new Error('apiRegister: response missing userId')
    }
    return { userId }
}