# ADR-0014: Use TanStack Query/Form and avoid a global state store

**Status:** Accepted

## Context

Most application data originates from the API. The app has forms and small local UI interactions but no demonstrated complex cross-feature client-only state.

## Decision

Use:

- TanStack Query for server state and mutations;
- TanStack Form for forms;
- React local state for small UI-only state.

Do not add Redux, Zustand, or another global store unless a concrete need appears.

Do not mirror TanStack Query data into a second client state store.

## Alternatives considered

- Redux or Zustand from the start.
- Duplicating API data in global state.
- Manual form-state management for all forms.

## Consequences

- Server data has one client-side owner.
- Cache invalidation/refetch handles synchronization after mutations.
- The frontend remains small and easy to reason about.
