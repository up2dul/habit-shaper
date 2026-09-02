# ADR-0001: Use a pnpm monorepo with two applications

**Status:** Accepted

## Context

Habit Shaper has one React frontend and one Node.js/TypeScript backend, must be runnable from the repository root, and should present a clear implementation history to reviewers.

## Decision

Use a pnpm workspace monorepo with `apps/web` and `apps/api`.

Do not create root shared packages until a genuine cross-application abstraction exists. Keep shadcn components inside the web app.

Use TypeScript, Oxlint, Lefthook, Commitlint, and Conventional Commits. Do not use Changesets.

## Alternatives considered

- Two unrelated frontend/backend repositories or directories without workspace tooling.
- A monorepo with speculative `packages/core`, `packages/ui`, and `packages/api-client` from day one.
- Changesets for package version orchestration.

## Consequences

- Root-level scripts and Docker workflow are straightforward.
- Type-only API contract imports are easy.
- The repository stays small and reviewable.
- Shared packages can still be extracted later if they earn their boundary.
