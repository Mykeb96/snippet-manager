import { test as setup, expect } from '@playwright/test'

const userFile = 'playwright/.auth/user.json'
const adminFile = 'playwright/.auth/admin.json'

setup('authenticate as user', async ({ page }) => {
  await page.goto('/auth')

  await page.getByRole('textbox', { name: 'Email' }).fill('testuser@gmail.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Password1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
  await page.context().storageState({ path: userFile })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth')

  await page.getByRole('textbox', { name: 'Email' }).fill('admin@snippet.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('MyAdmin1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
  await page.context().storageState({ path: adminFile })
})