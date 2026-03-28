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

- `Users` — list / get / create users
- `Snippets` — CRUD snippets (DTOs; snippets are tied to a user)
- `Favorites` — favorites by user; composite key `(userId, snippetId)` on delete
- `Tags` — tag catalog
- `Snippets/{id}/tags` — tags attached to a snippet (nested resource)

Use Swagger while developing to try requests and see schemas.

## Dev notes

- **Authentication** is not implemented. User creation accepts a `PasswordHash` field for local experimentation only; a production app would hash passwords server-side, add login, and protect endpoints.
- **SQLite** is fine for development; deploy would typically switch to a managed database and configuration via environment variables or user secrets.
