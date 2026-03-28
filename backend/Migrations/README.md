# EF Core migrations

Apply the schema to your local database from the `backend` folder:

```bash
dotnet ef database update
```

**Important:** Each migration’s `Up()` method must actually create or alter tables. An empty `Up()` can still be recorded in `__EFMigrationsHistory`, which leaves you with a database that has no tables and confusing runtime errors (for example, “no such table: Snippets”). If that happens, remove the bad migration, add a new one with a full `Up()`, then run `database update` again.

The current `InitialCreate` migration defines the full schema (Users, Snippets, Tags, join tables, etc.).
