import { test, expect } from '@playwright/test'
import { Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
  })

  function makeUniqueUser() {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return {
      username: `user${id}`,
      email: `user${id}@test.com`,
    };
  }

  async function fillEmail(email: string, page: Page) {
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
  }

  async function fillUsername(username: string, page: Page) {
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
  }

  async function fillPassword(password: string, page: Page) {
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
  }

  async function clickRegister(page: Page) {
    await page.getByRole('button', { name: 'Register' }).click();
  }

  async function clickSignIn(page: Page) {
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  test.describe('Sign in validation', () => {
    test('signs in successfully with valid credentials', async ({ page }) => {
      await fillEmail('admin@snippet.local', page);
      await fillPassword('MyAdmin1', page);
  
      await clickSignIn(page);
  
      await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    })
  
    test('shows an error for invalid credentials', async ({ page }) => {
      await fillEmail('test@gmail.com', page);
      await fillPassword('test123', page);
  
      await clickSignIn(page);
  
      await expect(page.getByRole('alert')).toContainText('Invalid credentials.');
    })
  })

  test.describe('Validate fields for registration', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Create an account' }).click();
    })

    test('Successful registration', async ({ page }) => {
      const user = makeUniqueUser();

      await fillUsername(user.username, page);
      await fillEmail(user.email, page);
      await fillPassword('Password1', page);

      await clickRegister(page);

      await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    })

    test('Requires username', async ({ page }) => {
      await fillEmail('test@gmail.com', page);
      await fillPassword('password123', page);
  
      await clickRegister(page);
  
      await expect(page.getByRole('alert')).toContainText('Username is required.');
    })

    test('Requires email', async ({ page }) => {
      await fillUsername('test123', page);
      await fillPassword('password123', page);

      await clickRegister(page);

      await expect(page.getByRole('alert')).toContainText('Username, Email, and Password are required.');
    })

    test('Requires password', async ({ page }) => {
      await fillUsername('test123', page);
      await fillEmail('test@gmail.com', page);

      await clickRegister(page);

      await expect(page.getByRole('alert')).toContainText('Username, Email, and Password are required.');
    })

    test('Invalid email', async ({ page }) => {
      await fillUsername('Admin123', page);
      await fillPassword('Password1', page);
      await fillEmail('test', page);

      await clickRegister(page);

      await expect(page.getByRole('alert')).toContainText('is invalid');
    })

    test.describe('Reject duplicate fields', () => {
      test('Duplicate username', async ({ page }) => {
        await fillUsername('Admin', page);
        await fillEmail('123@gmail.com', page);
        await fillPassword('Password1', page);
  
        await clickRegister(page);
  
        await expect(page.getByRole('alert')).toContainText('A user with that username already exists.');
      })
  
      test('Duplicate email', async ({ page }) => {
        await fillUsername('Admin123', page);
        await fillEmail('admin@snippet.local', page);
        await fillPassword('Password1', page);
  
        await clickRegister(page);
  
        await expect(page.getByRole('alert')).toContainText('A user with that email already exists.');
      })
    })

    test.describe('Password restrictions', () => {
      test.beforeEach(async ({ page }) => {
        const user = makeUniqueUser();
        await fillUsername(user.username, page);
        await fillEmail(user.email, page);
      })

      test('Rejects password shorter than 8 characters', async ({ page }) => {
        await fillPassword('Pass1', page);

        await clickRegister(page)

        await expect(page.getByRole('alert')).toContainText('Passwords must be at least 8 characters.');
      })

      test('Rejects password without uppercase letter', async ({ page }) => {
        await fillPassword('password1', page);

        await clickRegister(page);

        await expect(page.getByRole('alert')).toContainText('Passwords must have at least one uppercase');
      })

      test('Rejects password without lowercase letter', async ({ page }) => {
        await fillPassword('PASSWORD1', page);

        await clickRegister(page);

        await expect(page.getByRole('alert')).toContainText('Passwords must have at least one lowercase');
      })

      test('Rejects password without digit', async ({ page }) => {
        await fillPassword('Password', page);

        await clickRegister(page);

        await expect(page.getByRole('alert')).toContainText('Passwords must have at least one digit');
      })
    })
  })

  test('User stays logged in on refresh', async ({ page }) => {
    await fillEmail('admin@snippet.local', page);
    await fillPassword('MyAdmin1', page);

    await clickSignIn(page);

    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  })
})
