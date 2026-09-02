# ADR-0010: Enforce security at the server and database boundaries

**Status:** Accepted

## Context

Users can manipulate frontend HTML, JavaScript, requests, route parameters, and payloads. Cookie-based authentication also introduces CSRF considerations because browsers can attach cookies automatically.

## Decision

Treat the frontend as untrusted.

Enforce user ownership in database queries, for example by querying/updating/deleting with both resource ID and authenticated `user_id`.

For CSRF mitigation:

- `HttpOnly` session cookie;
- `Secure` in production;
- `SameSite=Lax`;
- strict allowed origin/CORS configuration;
- validate `Origin` on unsafe methods;
- never mutate state through GET;
- continue normal server-side authorization for every mutation.

Do not add a dedicated CSRF token mechanism unless future cross-site behavior requires it.

## Alternatives considered

- Trusting disabled/hidden frontend controls as authorization.
- Fetching by resource ID first and only then checking ownership in application code.
- A synchronizer CSRF token system from day one.

## Consequences

- DevTools or direct API usage cannot bypass ownership rules.
- Cross-site request abuse is mitigated without adding unnecessary token synchronization.
- Same-origin production deployment simplifies cookie behavior.
