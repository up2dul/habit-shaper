# ADR-0008: Use DB-backed opaque sessions in HTTP-only cookies

**Status:** Accepted

## Context

The application needs email/password authentication but does not require stateless distributed authentication, third-party clients, or refresh-token complexity.

## Decision

Use opaque server-side sessions stored in MySQL. Session identifiers are credentials, not normal entity identifiers, so they use cryptographically secure random opaque tokens rather than the UUIDv7 strategy used for application entities.

On login:

1. verify the password hash;
2. create a session row with an expiry;
3. set the opaque session ID in an HTTP-only cookie.

Protected requests validate the session in auth middleware before route logic.

Use approximately seven-day expiry for the coding-test implementation.

Logout deletes the current session row and clears the cookie.

Naturally expired rows may remain in the DB for now but are invalid once `expires_at` passes.

## Alternatives considered

- JWT access tokens.
- Access + refresh token architecture.
- Storing auth tokens in localStorage.
- Periodic client polling to check session expiry.

## Consequences

- Logout/revocation is immediate and simple.
- The client never needs to read the credential.
- Protected requests perform a session lookup.
- The API is stateful with respect to shared session storage, which is acceptable for this application.
- Session tokens remain deliberately separate from the application's UUIDv7 entity-ID strategy because possession of a session token grants authentication.
