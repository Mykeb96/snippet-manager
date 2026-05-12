import { test, expect } from '@playwright/test'

import {
    signInAsAdmin,
    signInAsUser
  } from './helpers/auth-helpers'

const BASE_URL = 'http://localhost:5173'

test.describe('Access control', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/auth`)
    })

    test.describe('As admin', () => {
        test.beforeEach(async ({ page }) => {
            await signInAsAdmin(page);
        })

        test('Has access to admin dashboard', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

            await page.getByRole('link', { name: 'Admin' }).click();

            await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
        })
    })

    test.describe('As user', () => {
        test.beforeEach(async ({ page }) => {
            await signInAsUser(page);
        })

        test('Does not have access to admin dashboard', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
        })

        test('Admin route redirects back to home', async ({ page }) => {
            await page.goto(`${BASE_URL}/admin`);

            await expect(page.getByRole('list', { name: 'Snippets timeline' })).toBeVisible();
            await expect(page).toHaveURL('/');
        })
    })

    test.describe('As guest', () => {
        test.describe('Protected routes redirect to sign in and back', () => {
            test('/profile/my-snippets', async ({ page }) => {
                await page.goto(`${BASE_URL}/profile/my-snippets`);

                await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

                await signInAsUser(page);

                await expect(page.getByRole('heading', { name: 'My snippets'})).toBeVisible();
            })

            test('/profile/favorites', async ({ page }) => {
                await page.goto(`${BASE_URL}/profile/favorites`);

                await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

                await signInAsUser(page);

                await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();
            })

            test('/profile/settings', async ({ page }) => {
                await page.goto(`${BASE_URL}/profile/settings`);

                await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

                await signInAsUser(page);

                await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
            })
        })
    })
})