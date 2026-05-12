import { Page } from "@playwright/test";

export function makeUniqueUser() {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return {
      username: `user${id}`,
      email: `user${id}@test.com`,
    };
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