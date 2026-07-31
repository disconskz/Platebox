# Platebox

Platebox is a React and Supabase application for print-production calculations.

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in the URL and publishable key of your Supabase project.
3. Install dependencies with `npm ci`.
4. Start the application with `npm run dev`.

The active migration directory is `supabase/migrations`. Historical migrations from
the previous database are stored in `supabase/legacy_migrations` for reference only
and must not be applied to a new project as-is.

See `supabase/README.md` before creating or changing the database schema.
