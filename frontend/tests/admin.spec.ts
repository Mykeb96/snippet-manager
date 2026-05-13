import { test, expect } from '@playwright/test'
import { apiDeleteUser, apiLogin, apiRegister, getStoredAuth } from './helpers/auth-helpers'
import { apiCreateTag, apiDeleteTag } from './helpers/tag-helpers'
import { formatTagDisplayName } from '../src/utils/formatTagDisplayName'

test.describe('Admin', () => {
    test.describe('As admin', () => {
        let adminToken: string;

        test.use({ storageState: 'playwright/.auth/admin.json' });

        test.beforeAll(async ({ request }) => {
            adminToken = await apiLogin(request, 'admin@snippet.local', 'MyAdmin1');
        });

        test.beforeEach(async ({ page }) => {
            await page.goto('/admin');
        });

        test('Can see admin dashboard shell', async ({ page }) => {
            await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();
            await expect(page.getByRole('region', { name: 'Users' })).toBeVisible();
            await expect(page.getByRole('region', { name: 'Tags' })).toBeVisible();
        });

        test.describe('In Users', () => {
            let disposableUserId: number | null = null;

            test.afterEach(async ({ request }) => {
                if (disposableUserId == null) return;
                await apiDeleteUser(request, adminToken, disposableUserId);
                disposableUserId = null;
            });

            test('Shows seed test user in the table', async ({ page }) => {
                const usersSection = page.getByRole('region', { name: 'Users' });
                await expect(usersSection.getByRole('cell', { name: 'testuser@gmail.com' })).toBeVisible();
                await expect(usersSection.getByRole('cell', { name: 'testuser', exact: true })).toBeVisible();
            });

            test('Does not show Delete on own row', async ({ page }) => {
                const { email } = await getStoredAuth(page);
                const ownRow = page.getByRole('row').filter({ hasText: email });
                await expect(ownRow.getByRole('button', { name: 'Delete' })).toHaveCount(0);
            });

            test('Can delete a user from the table', async ({ page, request }) => {
                const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                const username = `admindel${suffix}`;
                const email = `admindel${suffix}@test.com`;
                const { userId } = await apiRegister(request, {
                    username,
                    email,
                    password: 'Password1',
                });
                disposableUserId = userId;

                await page.reload();

                const row = page.getByRole('row').filter({ hasText: email });
                await expect(row).toBeVisible();

                await row.getByRole('button', { name: 'Delete' }).click();
                await page.locator('.swal-app-container').getByRole('button', { name: 'Delete user' }).click();

                await expect(page.getByRole('row').filter({ hasText: email })).toHaveCount(0);

                disposableUserId = null;
            });

            test('Owner can promote a user to admin', async ({ page, request }) => {
                const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                const username = `e2epromote${suffix}`;
                const email = `e2epromote${suffix}@test.com`;
                const { userId } = await apiRegister(request, {
                    username,
                    email,
                    password: 'Password1',
                });
                disposableUserId = userId;

                await page.reload();

                const row = page.getByRole('row').filter({ hasText: email });
                await expect(row).toBeVisible();

                const promoteResponse = page.waitForResponse(
                    (res) =>
                        res.request().method() === 'POST' &&
                        res.url().includes(`/api/users/${userId}/admin`) &&
                        res.status() === 204,
                );

                await row.getByRole('button', { name: 'Make admin' }).click();
                await promoteResponse;

                await expect(row.getByText('Admin', { exact: true })).toBeVisible();
            });
        });

        test.describe('In Tags', () => {
            let createdTagId: number | null = null;

            test.afterEach(async ({ request }) => {
                if (createdTagId == null) return;
                await apiDeleteTag(request, adminToken, createdTagId);
                createdTagId = null;
            });

            test('Can create a tag', async ({ page }) => {
                const slug = `e2et${Date.now()}`;
                const display = formatTagDisplayName(slug);

                const tagsSection = page.getByRole('region', { name: 'Tags' });

                const createResponse = page.waitForResponse(
                    (res) =>
                        res.request().method() === 'POST' &&
                        res.url().includes('/api/tags') &&
                        res.status() === 201,
                );

                await tagsSection.getByPlaceholder('New tag name').fill(slug);
                await tagsSection.getByRole('button', { name: 'Add tag' }).click();

                const createRes = await createResponse;
                const { id } = (await createRes.json()) as { id: number };
                createdTagId = id;

                const tagRow = tagsSection.getByRole('listitem').filter({ hasText: display });
                await expect(tagRow).toBeVisible();
            });

            test('Can edit a tag', async ({ page, request }) => {
                const idPart = Date.now();
                const slug = `e2et${idPart}`;
                const slugEdited = `e2et${idPart}edited`;
                const displayInitial = formatTagDisplayName(slug);
                const displayEdited = formatTagDisplayName(slugEdited);

                const { id } = await apiCreateTag(request, adminToken, slug);
                createdTagId = id;

                await page.reload();

                const tagsSection = page.getByRole('region', { name: 'Tags' });
                const tagRow = tagsSection.getByRole('listitem').filter({ hasText: displayInitial });
                await expect(tagRow).toBeVisible();

                await tagRow.getByRole('button', { name: 'Edit' }).click();
                const editField = tagsSection.getByRole('textbox', { name: 'Edit tag name' });
                await expect(editField).toBeVisible();
                await editField.fill(slugEdited);

                const updateResponse = page.waitForResponse(
                    (res) =>
                        res.request().method() === 'PUT' &&
                        res.url().includes(`/api/tags/${id}`) &&
                        res.status() === 200,
                );
                await tagsSection.getByRole('button', { name: 'Save' }).click();
                await updateResponse;

                const renamedRow = tagsSection.getByRole('listitem').filter({ hasText: displayEdited });
                await expect(renamedRow).toBeVisible();
            });

            test('Can delete a tag', async ({ page, request }) => {
                const slug = `e2et${Date.now()}`;
                const display = formatTagDisplayName(slug);

                const { id } = await apiCreateTag(request, adminToken, slug);
                createdTagId = id;

                await page.reload();

                const tagsSection = page.getByRole('region', { name: 'Tags' });
                const tagRow = tagsSection.getByRole('listitem').filter({ hasText: display });
                await expect(tagRow).toBeVisible();

                await tagRow.getByRole('button', { name: 'Delete' }).click();
                await page.locator('.swal-app-container').getByRole('button', { name: 'Delete' }).click();

                await expect(tagsSection.getByRole('listitem').filter({ hasText: display })).toHaveCount(0);

                createdTagId = null;
            });
        });
    });
});
