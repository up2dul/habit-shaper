# ADR-0009: Use REST-oriented routes and standardized errors without premature versioning

**Status:** Accepted

## Context

The API has one first-party client and no requirement to maintain multiple incompatible versions. The client can use HTTP status codes directly.

## Decision

Use resource-oriented REST routes and HTTP methods. Do not add `/v1` until a real breaking-contract coexistence requirement exists.

Return successful data directly rather than wrapping it in `{ success: true }`.

Use a consistent error envelope:

```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "Habit not found"
  }
}
```

Use a global Hono error handler for application-error-to-HTTP mapping.

Centralize every error code the API can emit in one registry. `ERROR_CODES` enumerates the codes; the registry defines each code's default message and HTTP status; `AppError(code)` derives both, with an optional per-instance message override for dynamic messages. Services throw semantic codes only; the HTTP layer (`onError`) applies the status mapping. HTTP status constants are named (e.g. `HttpStatus.NOT_FOUND`) rather than unexplained numeric literals.

## Alternatives considered

- `/api/v1` from day one.
- Verb-oriented endpoints such as `/createHabit`.
- Universal `{ success, data, error }` envelopes.
- Per-route repetitive `try/catch` response mapping.

## Consequences

- API behavior remains simple and conventional.
- Internal backend refactors do not imply API version changes.
- Clients rely on HTTP semantics and typed response bodies.
