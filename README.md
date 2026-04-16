# Snippet manager

Full-stack app for saving and organizing code snippets: a **ASP.NET Core** REST API with **SQLite** / **EF Core**, and a **React + TypeScript + Vite** frontend.

## Stack

| Part | Tech |
|------|------|
| API | .NET 10, EF Core, SQLite (`backend/app.db`), Swagger |
| UI | React 19, TypeScript, Vite |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (LTS is fine)

## Run the API

The API will not start until **`Jwt:Key`** is set (minimum 32 characters). It is intentionally not committed to the repo. For **local development**, set it once with user secrets from the `backend` folder:

```bash
cd backend
dotnet user-secrets set "Jwt:Key" "<your-secret-at-least-32-chars>"
```

Alternatively set the environment variable **`Jwt__Key`** to the same value. See [Configuration and secrets](#configuration-and-secrets) for production-style env vars.

From the repo root:

```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

- API (default profile): **http://localhost:5090**
- Swagger UI (Development): **http://localhost:5090/swagger**

The database file is `backend/app.db`. See [backend/Migrations/README.md](backend/Migrations/README.md) for how migrations work and what to do if the schema gets out of sync.

If `dotnet ef` is not recognized, install the EF Core CLI once: `dotnet tool install --global dotnet-ef`.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the UI at **http://localhost:5173**. CORS is configured on the API for that origin.

## API overview

REST routes live under `/api`, for example:

- `Auth` — register/login and JWT issuance
- `Users` — list/get user summaries
- `Snippets` — CRUD snippets (owner-based writes)
- `Favorites` — favorites by user; composite key `(userId, snippetId)` on delete
- `Tags` — global tag catalog (write operations are admin-only)
- `Snippets/{id}/tags` — tags attached to a snippet (nested resource)

Use Swagger while developing to try requests and see schemas.

## Configuration and secrets

Production-style convention in this repo is:

- **Use environment variables as the primary secret/config source** (especially in deployed environments).
- **Do not commit secrets** (`Jwt:Key`, admin seed password, production DB credentials) to repo JSON files.
- **Optionally use user secrets only for local development convenience**.

Common environment variable keys:

- `Jwt__Key` (required in all environments; minimum 32 chars)
- `ConnectionStrings__DefaultConnection` (required in all environments)
- `AdminSeed__Password` (optional, Development only, used when first creating the dev admin)
- `Cors__AllowedOrigins__0` (set one or more frontend origins)

## Dev notes

- **Auth model:** ASP.NET Core Identity + JWT bearer tokens.
- **Write authorization:** write routes require authentication, and snippet/favorite/tag-link writes enforce ownership based on the JWT user id claim.
- **Roles:** tag creation/deletion requires the `Admin` role (`[Authorize(Roles = "Admin")]`).
- **Tag management rule:** tags are shared/global metadata; deletion is blocked while a tag is in use by snippets.
- **Development admin seed:** on startup in Development, the app ensures an admin role exists and creates the admin user only when `AdminSeed:Password` is provided (for example via `AdminSeed__Password`).
- **JWT secret handling:** configure `Jwt:Key` via environment variables (or user secrets locally). There is no hardcoded fallback. Startup fails if missing, with a development-friendly setup message in Development.
- **Database config:** `ConnectionStrings:DefaultConnection` must be explicitly configured in all environments.
- **CORS config:** `Cors:AllowedOrigins` is required in all environments (no hardcoded fallback).
- **Pagination metadata:** list endpoints include `X-Total-Count`, `X-Page`, and `X-Page-Size` headers.
