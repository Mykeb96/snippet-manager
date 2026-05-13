# Playwright end-to-end tests

This directory contains the end-to-end test suite for the Snippet Manager frontend. The suite is written in TypeScript with [Playwright](https://playwright.dev/) and runs against a real backend so the tests exercise the full HTTP + DB stack, not mocks.

The goal was to write tests that look like what I'd ship on a team: deterministic, fast, readable, and resilient to UI churn.

---

## Layout

```
tests/
├── auth.setup.ts             # signs in once per role, saves storage state
├── auth.spec.ts              # sign-in flow + registration validation
├── access-control.spec.ts    # route guards for guest / user / admin
├── feed.spec.ts              # public timeline, compose, delete, favorites
├── profile.spec.ts           # my snippets, favorites, settings
├── admin.spec.ts             # admin dashboard: users CRUD, tags CRUD
└── helpers/
    ├── api-config.ts         # API base URL (env-overridable)
    ├── auth-helpers.ts       # apiLogin / apiRegister / apiDeleteUser / getStoredAuth
    ├── snippet-helpers.ts    # apiCreateSnippet / apiDeleteSnippet / createSnippetViaUi
    └── tag-helpers.ts        # apiCreateTag / apiDeleteTag
```

---

## How it runs

`playwright.config.ts` defines four projects:

| Project | Role |
|---|---|
| `setup` | Signs in via the UI as the seed admin and the seed user, writes `playwright/.auth/admin.json` and `playwright/.auth/user.json` |
| `chromium` / `firefox` / `webkit` | Each depends on `setup`, then runs every spec against that browser |

Every test that needs authentication uses **`test.use({ storageState: 'playwright/.auth/<role>.json' })`** to spin up a fresh browser context that's already signed in. Setup runs **once per test session** — individual tests never call `/api/auth/login` from the UI.

This is the difference between a suite that hammers your auth endpoint and one that doesn't. It also keeps tests under your backend's rate-limit budget without any retry-with-backoff cleverness.

---

## Patterns

### API-driven arrange, UI-driven assert

Test data is created via authenticated `request.post(...)` calls before the UI exercises the behavior:

```ts
test('Can see created snippet', async ({ page, request }) => {
    const accessToken = await getAccessToken(page);
    const { id } = await apiCreateSnippet(request, accessToken, {
        title: snippetTitle,
        code: 'Here is some code',
    });
    createdSnippetId = id;

    await page.reload();

    await expect(
        page.getByRole('list', { name: 'Your snippets' })
            .getByRole('listitem')
            .filter({ hasText: snippetTitle })
            .first()
    ).toHaveCount(1);
});
```

Why: the **act/assert** is "user views their snippet" — that's the only thing this test owns. Creating a snippet through the UI here would couple this test to the compose form, which has its own dedicated test.

### Re-using the JWT instead of logging in again

Helpers like `getAccessToken(page)` and `getStoredAuth(page)` read `localStorage['snippet-manager.auth']` from the browser context that `storageState` hydrated. No additional `/api/auth/login` calls per test.

```ts
const accessToken = await getAccessToken(page);
await apiCreateSnippet(request, accessToken, { ... });
```

For roles that don't have a `storageState` (e.g. when a `beforeAll` needs an admin token just for cleanup, not navigation), one `apiLogin` per `describe` block is the right cost — and that's how the admin token is acquired in `profile.spec.ts` and `admin.spec.ts`.

### Deterministic cleanup

Each `describe` that mutates the DB keeps a nullable id and an `afterEach` that deletes via the API. Cleanup runs whether the test passes or fails:

```ts
test.describe('Disposable user', () => {
    let disposableUserId: number | null = null;

    test.afterEach(async ({ request }) => {
        if (disposableUserId == null) return;
        await apiDeleteUser(request, adminToken, disposableUserId);
        disposableUserId = null;
    });

    test('Can delete a user from the table', async ({ page, request }) => {
        const { userId } = await apiRegister(request, { ... });
        disposableUserId = userId;

        // ... UI flow ...

        // If the UI delete succeeded, mark cleanup as done so the
        // afterEach doesn't hit the API with a stale id.
        disposableUserId = null;
    });
});
```

`apiDeleteUser`, `apiDeleteSnippet`, and `apiDeleteTag` all tolerate `404` so a passing test that's already cleaned up doesn't make the `afterEach` throw.

### Locator strategy

The suite uses **role-based locators** with accessible names everywhere:

```ts
page.getByRole('region', { name: 'Favorites' });
page.getByRole('list', { name: 'Snippets timeline' });
page.getByRole('listitem').filter({ hasText: snippetTitle });
page.getByRole('cell', { name: 'testuser', exact: true });
page.getByRole('button', { name: 'Delete snippet' });
```

No `data-testid`, no class selectors. If the markup is restructured but the page still presents the same regions, lists, and buttons to assistive tech, the tests still pass — which is the right correlation for a frontend test.

For SweetAlert confirmation modals, the suite scopes by the app-applied container class:

```ts
await page.locator('.swal-app-container')
    .getByRole('button', { name: 'Delete user' })
    .click();
```

### Synchronizing on the network, not on guesses

Click handlers that fire `fetch` calls don't resolve to the test when the click event finishes — only when Playwright's click resolves, which is **before** the request lands. For "click → server work → navigate or assert downstream" flows, the suite waits for the response explicitly:

```ts
const favoriteResponse = page.waitForResponse(
    (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/api/favorites') &&
        res.status() === 201,
);
await snippet.getByRole('button', { name: 'Add to favorites' }).click();
await favoriteResponse;

await page.goto('/profile/favorites');
```

Status codes are matched **exactly** — `201` for create, `204` for promote, `200` for update. The suite treats response shape as part of the API contract, so a backend change from `201` to `200` will fail the test fast and force a deliberate decision.

### Resilient assertions

For empty/non-empty states, the suite asserts the **visible signal**, not internal markup:

```ts
// Good — works whether the favorites <ul> is rendered or omitted on empty.
const favoritesPanel = page.getByRole('region', { name: 'Favorites' });
await expect(favoritesPanel.getByRole('heading', { name: snippetTitle })).toBeVisible();

// Avoid — fails when the list is empty because the <ul> is missing.
await expect(
    page.getByRole('list', { name: 'Your favorite snippets' })
        .getByRole('listitem')
).toHaveCount(1);
```

### Type-safe display strings

The tag tests import the actual frontend formatter to derive the display string:

```ts
import { formatTagDisplayName } from '../src/utils/formatTagDisplayName';

const slug = `e2et${Date.now()}`;
const display = formatTagDisplayName(slug);
```

The test always agrees with whatever the UI renders, with no duplicated literals to drift.

---

## Running the suite

The Playwright tests expect the backend to be running. Start the API with the `testing` launch profile to disable rate limiting for the run:

```bash
# Terminal 1 — API
cd backend
dotnet run --launch-profile testing
```

```bash
# Terminal 2 — Frontend dev server
cd frontend
npm run dev
```

```bash
# Terminal 3 — Tests
cd frontend
npx playwright install   # one-time
npx playwright test
```

Common flags:

```bash
# Single browser
npx playwright test --project=chromium

# Single spec
npx playwright test tests/profile.spec.ts

# UI mode (run / debug interactively)
npx playwright test --ui

# Only tests matching a name
npx playwright test -g "Can delete a tag"

# Skip setup deps (if storageState is already on disk)
npx playwright test --no-deps tests/profile.spec.ts
```

---

## What's covered

| Spec | Test count | Surface |
|---|---|---|
| `auth.spec.ts` | sign-in valid/invalid, registration validation + happy path | `/auth` |
| `access-control.spec.ts` | guest redirects, admin link visibility, admin route guard | `/profile/*`, `/admin` |
| `feed.spec.ts` | guest browse, sign-in banner, favorite-redirects, compose, delete own, can't delete others, favorites toggle, admin delete-any | `/` |
| `profile.spec.ts` | nav, my snippets list/create/delete/empty, favorites add/remove/empty, settings reads stored identity | `/profile/*` |
| `admin.spec.ts` | dashboard shell, users table, no delete on own row, delete other user, promote to admin, tags create/edit/delete | `/admin` |

Read-only tests (e.g. "shows seed test user in the table") are intentionally side-effect-free; mutating tests own their own data and clean it up.

---

## Backend testing companion

The xUnit suite at `backend.tests/` runs the API in-process with an isolated SQLite database, exercising auth, snippets, tags, favorites, and admin routes at the HTTP layer. It's the unit-of-integration analog to this Playwright suite — together they cover both ends of the system.

```bash
dotnet test backend.tests/backend.tests.csproj
```
