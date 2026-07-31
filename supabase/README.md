# Supabase database workflow

This directory is intentionally detached from the previous Supabase project.

## Directory layout

- `migrations/` contains only the new, reviewed schema history.
- `legacy_migrations/` is a read-only reference for reconstructing product behavior.
- `functions/` contains Edge Functions that use an OpenAI-compatible AI endpoint.

## New project workflow

1. Create a new Supabase project and connect the Supabase tooling.
2. Link the local repository to that project.
3. Design the new schema from application use cases and legacy behavior.
4. Create migration files with `supabase migration new <name>`.
5. Explicitly grant required Data API privileges; new tables are not exposed automatically.
6. Enable RLS on every exposed table and add ownership- or role-based policies.
7. Apply and verify migrations in a development project before production.
8. Generate fresh TypeScript database types after the schema is stable.
9. Run database advisors and the application test suite.

Never expose a secret or service-role key in a `VITE_` variable. Frontend code may
contain only the Supabase URL and publishable key.
