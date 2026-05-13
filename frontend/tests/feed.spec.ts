import { test, expect } from '@playwright/test'
import {
  apiCreateSnippet,
  apiDeleteSnippet,
  createSnippetViaUi,
} from './helpers/snippet-helpers'
import { apiLogin, getAccessToken } from './helpers/auth-helpers'

test.describe('Feed', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })
    test.describe('As guest', () => {
        test('Can load and browse feed', async ({ page }) => {
            const timeline = page.getByRole('list', { name: 'Snippets timeline'});
            const posts = timeline.getByRole('listitem');

            await expect(timeline).toBeVisible();
            await expect(posts.first()).toBeVisible();
        })

        test('Can see sign in banner', async ({ page }) => {
            await expect(page.getByText('to post snippets and save favorites.')).toBeVisible();
        })

        test('Favoriting redirects to sign in', async ({ page }) => {
            const timeline = page.getByRole('list', { name: 'Snippets timeline' });
            const snippet = timeline.getByRole('listitem').first();

            const addFavorite = snippet.getByRole('button', { name: 'Add to favorites' });
            await addFavorite.click();

            await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
            await expect(page).toHaveURL(/\/auth(\?|$)/);
        })
    })

    test.describe('As user', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });

        test('Can see create snippet form', async ({ page }) => {
            await expect(page.getByRole('form', { name: 'Create snippet' })).toBeVisible();
        })

        test('Can create and see posted snippet', async ({ page }) => {
            const snippetTitle = `My Code Snippet ${Date.now()}`;

            const form = page.getByRole('form', { name: 'Create snippet' });
            await form.getByRole('textbox', { name: 'Title' }).fill(snippetTitle);
            await form.getByPlaceholder('Paste or write your snippet…').fill('Here is some code');
            await form.getByRole('button', { name: 'Post' }).click();

            const card = page
              .getByRole('list', { name: 'Snippets timeline' })
              .getByRole('listitem')
              .filter({ hasText: snippetTitle })
            await expect(card).toBeVisible();
            await expect(card.getByRole('heading', { name: snippetTitle })).toBeVisible();
        })

        test.describe('Cannot create snippet without required fields', async () => {
            test('Without title', async ({ page }) => {
                await page.getByPlaceholder('Paste or write your snippet…').fill('Here is some code');

                await expect(page.getByRole('button', { name: 'Post' })).toBeDisabled();
            })

            test('Without body', async ({ page }) => {
                await page.getByRole('textbox', { name: 'Title' }).fill('My Code Snippet');

                await expect(page.getByRole('button', { name: 'Post' })).toBeDisabled();
            })
        })

        test('Can delete own snippet', async ({ page }) => {
            const snippetTitle = `My Code Snippet ${Date.now()}`;
            const { snippet } = await createSnippetViaUi(page, {
                title: snippetTitle,
                code: 'Here is some code',
            });

            const deleteSnippetButton = snippet.getByRole('button', { name: 'Delete snippet' });
            await expect(deleteSnippetButton).toBeVisible();
            await deleteSnippetButton.click();

            await page.locator('.swal-app-container').getByRole('button', { name: 'Delete' }).click();

            await expect(snippet).toHaveCount(0);
        })

        test.describe('Cannot delete non-owned snippets', () => {
            let orphanSnippetId: number | null = null;

            test.afterEach(async ({ request }) => {
                if (orphanSnippetId == null) return;
                const adminToken = await apiLogin(request, 'admin@snippet.local', 'MyAdmin1');
                await apiDeleteSnippet(request, adminToken, orphanSnippetId);
                orphanSnippetId = null;
            })

            test('Delete button is hidden on other users\' snippets', async ({ page, request }) => {
                const snippetTitle = `Other user snippet ${Date.now()}`;
                const adminToken = await apiLogin(request, 'admin@snippet.local', 'MyAdmin1');
                const { id } = await apiCreateSnippet(request, adminToken, {
                    title: snippetTitle,
                    code: 'Posted by admin; viewed by regular user',
                });
                orphanSnippetId = id;

                await page.reload();

                const snippet = page
                    .getByRole('list', { name: 'Snippets timeline' })
                    .getByRole('listitem')
                    .filter({ hasText: snippetTitle });

                await expect(snippet).toBeVisible();
                await expect(snippet.getByRole('button', { name: 'Delete snippet' })).toHaveCount(0);
            })
        })

        test.describe('Can interact with favorites', () => {
            let createdSnippetId: number | null = null;

            test.afterEach(async ({ page, request }) => {
                if (createdSnippetId == null) return;
                const token = await getAccessToken(page);
                await apiDeleteSnippet(request, token, createdSnippetId);
                createdSnippetId = null;
            })

            test('Add favorite', async ({ page }) => {
                const snippetTitle = `My Code Snippet ${Date.now()}`;
                const { id, snippet } = await createSnippetViaUi(page, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = id;

                const addFavorite = snippet.getByRole('button', { name: 'Add to favorites' });

                await expect(addFavorite).toBeVisible();
                await addFavorite.click();

                const removeFavorite = snippet.getByRole('button', { name: 'Remove from favorites' });

                await expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');
            })

            test('Remove favorite', async ({ page }) => {
                const snippetTitle = `My Code Snippet ${Date.now()}`;
                const { id, snippet } = await createSnippetViaUi(page, {
                    title: snippetTitle,
                    code: 'Here is some code',
                });
                createdSnippetId = id;

                await snippet.getByRole('button', { name: 'Add to favorites' }).click();

                await snippet.getByRole('button', { name: 'Remove from favorites' }).click();

                await expect(snippet.getByRole('button', { name: 'Add to favorites' }))
                    .toHaveAttribute('aria-pressed', 'false');
            })
        })
    })

    test.describe('As admin', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        let orphanSnippetId: number | null = null;

        test.afterEach(async ({ request }) => {
            if (orphanSnippetId == null) return;
            const adminToken = await apiLogin(request, 'admin@snippet.local', 'MyAdmin1');
            await apiDeleteSnippet(request, adminToken, orphanSnippetId);
            orphanSnippetId = null;
        });

        test('Can delete non-owned snippet', async ({ page, request }) => {
            const snippetTitle = `Admin delete target ${Date.now()}`;
            const userToken = await apiLogin(request, 'testuser@gmail.com', 'Password1');
            const { id } = await apiCreateSnippet(request, userToken, {
                title: snippetTitle,
                code: 'Created via API by test user for admin delete test',
            });
            orphanSnippetId = id;

            await page.goto('/');

            const timeline = page.getByRole('list', { name: 'Snippets timeline' });
            const snippet = timeline.getByRole('listitem').filter({ hasText: snippetTitle });
            await expect(snippet).toBeVisible();

            await snippet.getByRole('button', { name: 'Delete snippet' }).click();
            await page.locator('.swal-app-container').getByRole('button', { name: 'Delete' }).click();

            await expect(timeline.getByRole('heading', { name: snippetTitle })).toHaveCount(0);
            orphanSnippetId = null;
        });
    })
})