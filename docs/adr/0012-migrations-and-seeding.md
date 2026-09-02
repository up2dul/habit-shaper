# ADR-0012: Run checked-in migrations automatically; keep seeding optional

**Status:** Accepted

## Context

The coding-test brief requires `docker compose up` from the repository root to bootstrap the complete stack, including the database schema, without a local toolchain.

## Decision

Commit generated Drizzle SQL migration files.

On Compose startup:

1. start MySQL;
2. wait for DB health;
3. run pending migrations from the API container;
4. start the API.

Do not require a manual migration command for reviewers.

Keep seed data optional and explicit via `pnpm db:seed` or `docker compose exec api pnpm db:seed`.

## Alternatives considered

- Requiring reviewers to run migrations manually.
- Automatically seeding demo data on every boot.
- Using schema push as the only source of schema history.

## Consequences

- Fresh clones are reproducible with Docker Compose only.
- Schema evolution is visible in Git.
- Repeated app starts do not unexpectedly mutate demo data.
