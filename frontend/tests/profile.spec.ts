import { test, expect } from '@playwright/test'
import { apiCreateSnippet, apiDeleteSnippet } from './helpers/snippet-helpers'
import { apiLogin, getAccessToken, getStoredAuth } from './helpers/auth-helpers'

test.describe('Profile', () => {
    test.describe('As user', () => {
        let createdSnippetId: number | null = null;
        let adminToken: string;

        test.describe.configure({ mode: 'serial' });
        test.use({ storageState: 'playwright/.auth/user.json' });

        test.beforeAll(async ({ request }) => {
            adminToken = await apiLogin(request, 'admin@snippet.local', 'MyAdmin1');
        });

        test.beforeEach(async ({ page }) => {
            await page.goto('/profile');
        });

        test.afterEach(async ({ request }) => {
            if (createdSnippetId == null) return;
            await apiDeleteSnippet(request, adminToken, createdSnippetId);
            createdSnippetId = null;
        });

        test('Can see nav', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'My snippets' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Favorites' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
        });

        test.describe('In My snippets', () => {
            test('Can see created snippet', async ({ page, request }) => {
                const snippetTitle = `Code Snippet #${Date.now()}`;
                const accessToken = await getAccessToken(page);
                const { id: snippetId } = await apiCreateSnippet(request, accessToken, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = snippetId;

                await page.reload();

                const mySnippets = page.getByRole('list', { name: 'Your snippets' });
                const snippet = mySnippets
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle })
                    .first();

                await expect(snippet).toHaveCount(1);
            });

            test('Can delete snippet', async ({ page, request }) => {
                const snippetTitle = `Code Snippet #${Date.now()}`;
                const accessToken = await getAccessToken(page);
                const { id: snippetId } = await apiCreateSnippet(request, accessToken, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = snippetId;

                await page.reload();

                const mySnippets = page.getByRole('list', { name: 'Your snippets' });
                const snippet = mySnippets
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle })
                    .first();

                await expect(snippet).toHaveCount(1);

                await snippet.getByRole('button', { name: 'Delete snippet' }).click();
                await page.locator('.swal-app-container').getByRole('button', { name: 'Delete' }).click();

                await expect(snippet).toHaveCount(0);

                createdSnippetId = null;
            });

            test('Can see empty UI state', async ({ page }) => {
                await expect(
                    page.getByText('No snippets yet. Post something from the home feed.')
                ).toBeVisible();
            });
        });

        test.describe('In Favorites', () => {
            test.beforeEach(async ({ page }) => {
                await page.goto('/profile/favorites');
            });

            test('Can see favorited snippet', async ({ page, request }) => {
                const snippetTitle = `Code Snippet #${Date.now()}`;
                const accessToken = await getAccessToken(page);

                const { id: snippetId } = await apiCreateSnippet(request, accessToken, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = snippetId;

                await page.goto('/');

                const timeline = page.getByRole('list', { name: 'Snippets timeline' });
                const snippet = timeline
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle })
                    .first();

                await expect(snippet).toBeVisible();

                const favoriteResponse = page.waitForResponse(
                    (res) =>
                        res.request().method() === 'POST' &&
                        res.url().includes('/api/favorites') &&
                        res.status() === 201,
                );
                await snippet.getByRole('button', { name: 'Add to favorites' }).click();
                await favoriteResponse;

                await page.goto('/profile/favorites');

                const favoritesPanel = page.getByRole('region', { name: 'Favorites' });
                await expect(favoritesPanel.getByRole('heading', { name: snippetTitle })).toBeVisible();
            });

            test('Can remove favorites', async ({ page, request }) => {
                const snippetTitle = `Code Snippet #${Date.now()}`;
                const accessToken = await getAccessToken(page);

                const { id: snippetId } = await apiCreateSnippet(request, accessToken, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = snippetId;

                await page.goto('/');

                const timeline = page.getByRole('list', { name: 'Snippets timeline' });
                const timelineSnippet = timeline
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle })
                    .first();

                await expect(timelineSnippet).toBeVisible();

                const favoriteResponse = page.waitForResponse(
                    (res) =>
                        res.request().method() === 'POST' &&
                        res.url().includes('/api/favorites') &&
                        res.status() === 201,
                );
                await timelineSnippet.getByRole('button', { name: 'Add to favorites' }).click();
                await favoriteResponse;

                await page.goto('/profile/favorites');

                const favoritesPanel = page.getByRole('region', { name: 'Favorites' });
                const favoriteCard = favoritesPanel
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle })
                    .first();

                await expect(favoriteCard).toBeVisible();

                await favoriteCard.getByRole('button', { name: 'Remove from favorites' }).click();

                await expect(favoriteCard).toHaveCount(0);
            });

            test('Can see empty UI state', async ({ page }) => {
                await expect(
                    page.getByText('No favorites yet. Heart a snippet on the home feed.')
                ).toBeVisible();
            });
        });

        test.describe('In Settings', () => {
            test.beforeEach(async ({ page }) => {
                await page.goto('/profile/settings');
            });

            test('Shows the signed-in account', async ({ page }) => {
                const { email, username } = await getStoredAuth(page);

                const settings = page.getByRole('region', { name: 'Settings' });
                await expect(settings).toContainText('Signed in as');
                await expect(settings).toContainText(email);
                await expect(settings).toContainText(`@${username}`);
            });
        });
    });
});
