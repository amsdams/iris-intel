# Facade Pattern

Status: Phase 1 working pattern from the COMM, portal details, search, map-data-request, player tracker,
portal-link-navigation, context action, and request diagnostics facade slices.

## Purpose

Use thin IITC-named facades as behavior-preserving landing zones for parity work. A facade should make a concrete domain
easier to compare against IITC-CE without forcing a broad architecture rewrite.

The goal is not to move a whole feature into `packages/iitc-core`. The goal is to move pure, stable behavior behind a
small typed boundary while leaving browser and UI effects in the app runtime.

## Ownership Rule

Move to `packages/iitc-core`:

- Pure parsing, normalization, ordering, request planning, and response application.
- Request-state shaping such as `idle`, `loading`, `ready`, `empty`, `error`, and `auth`.
- Domain diagnostics that help compare IRIS behavior against IITC behavior.
- Small cache helpers only when the cache behavior is pure and bounded.

Keep in `apps/iitc-iris`:

- Fetch execution, CSRF/version handling, and auth classification.
- AbortController ownership and cancellation policy.
- Leaflet rendering, map movement, selected-object guards, and stale-response guards.
- React state, keyboard interaction, scroll retention, and visual grouping.
- App-specific display models unless core can stay UI-neutral through a callback.

## Implementation Shape

Prefer small helpers with IITC names:

```ts
export interface IitcDomainState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
}

export function createIitcDomainIdleState(...) { ... }
export function createIitcDomainLoadingState(...) { ... }
export function createIitcDomainSuccessState(...) { ... }
export function createIitcDomainErrorState(...) { ... }

export function parseIitcDomainResponse(...) { ... }
export function applyIitcDomainResponse(...) { ... }
export function normalizeIitcDomainResult(...) { ... }
```

The runtime should become orchestration:

```ts
postState(createIitcDomainLoadingState(...));

try {
  const response = await fetchRuntimeOwnedThing(...);
  const result = applyIitcDomainResponse(response, ...);
  postState(createIitcDomainSuccessState(result));
} catch (error) {
  postState(createIitcDomainErrorState(...));
}
```

If core needs an app-specific display value, pass a callback instead of importing app message types. COMM preview shaping
uses this pattern.

## Tests

Add focused core tests for the extracted contract:

- State helper output.
- Parser and response application parity.
- Normalization, ordering, and de-duplication.
- Cache hit/write/prune behavior when applicable.
- Diagnostics shape.

Tests should lock current behavior before improving it. If an existing behavior is surprising, document it and defer the
behavior change to a separate parity or UX pass.

## Documentation

Each facade plan should record:

- IITC source files and concepts being mirrored.
- Current IRIS files being changed.
- Core ownership vs runtime ownership.
- Non-goals.
- Validation commands.
- Manual/live comparison notes.

## Review Before Continuing

After several facade slices, do a short review before adding more:

- Confirm helper naming is consistent.
- Confirm state helpers have the same level of responsibility across domains.
- Confirm no app-only UI types leaked into `packages/iitc-core`.
- Confirm runtime still owns effects and cancellation.
- Confirm tests cover the extracted contract rather than incidental UI behavior.

## Phase 1 Retrospective

The pattern is useful, but it should stay selective. The strongest facades extracted pure behavior that was already
domain-shaped: request planning, response application, result normalization, map-object matching, active request
diagnostics, and portal/context navigation plans.

The pattern is weak when the target is mostly app composition. JSX layout, panel state, keyboard interaction, DOM
gestures, Leaflet layer mutation, and request cancellation are better handled as app-side modules or hooks. Moving those
into core would blur ownership and make parity debugging harder.

Use facades later as a parity tool, not as the default refactoring mechanism. When extracting UI or runtime code, prefer
an app module unless the behavior can be tested as a small IITC-named contract without browser globals.
