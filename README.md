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

## Dev notes

- **Auth model:** ASP.NET Core Identity + JWT bearer tokens.
- **Write authorization:** write routes require authentication, and snippet/favorite/tag-link writes enforce ownership based on the JWT user id claim.
- **Roles:** tag creation/deletion requires the `Admin` role (`[Authorize(Roles = "Admin")]`).
- **Tag management rule:** tags are shared/global metadata; deletion is blocked while a tag is in use by snippets.
- **Development admin seed:** on startup in Development, the app ensures an admin user/role exists. Defaults come from `AdminSeed` in `appsettings.Development.json` (email `admin@snippet.local`, password `Admin1234`).
- **JWT secret handling:** configure `Jwt:Key` via environment variables or user secrets. In Development only, a fallback key is used if missing (warning logged). Outside Development, startup fails if no key is provided.
- **SQLite** is fine for development; deploy would typically switch to a managed database and configuration via environment variables or user secrets.
