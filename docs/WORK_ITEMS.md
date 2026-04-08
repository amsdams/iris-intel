# Work Items

## Status Key

- `Open`
- `In Progress`
- `Done`
- `Blocked`
- `Investigating`
- `Reverted`

## Runtime Ownership And Startup Discipline
Status: `In Progress`

Goal:
- make startup, login handling, and recurring runtime behavior deliberate instead of noisy or overlapping

### Logged-out Intel startup is clear and non-intrusive
Status: `Done`

Outcome:
- detect the logged-out Intel landing page
- show IRIS guidance without replacing Intel's own login page
- suppress the full IRIS shell while logged out
- keep the logged-out mobile experience compact

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Detect logged-out landing page | Done | `initial_login_required` is implemented |
| Show IRIS sign-in-required guidance | Done | helper layer only; Intel login remains primary |
| Suppress full IRIS shell while logged out | Done | topbar/map shell no longer mounts on the landing page |

### Coordinator-owned polling is predictable
Status: `In Progress`

Outcome:
- recurring requests should be coordinator-owned and easier to reason about

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Coordinator session gating cleanup | Done | now blocks both `expired` and `initial_login_required` |
| Inventory polling freshness/in-flight cleanup | Done | inventory now follows the same basic discipline as artifacts/subscription |
| Passive fetch lifecycle ordering cleanup | Done | `END` no longer lands before `SUCCESS` / `DATA` |
| Keep tracking startup duplicate score/subscription burst | Open | only patch when ownership is clearer |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Initial duplicate `getHasActiveSubscription` / `getGameScore` burst on startup | Open | later polling is single and predictable; tracked refinement, not blocker |
| Player-stats publication is still noisier than ideal | Investigating | materially improved, but still worth keeping disciplined |

## Intel Parity Features
Status: `In Progress`

Goal:
- restore missing Intel-core behavior carefully, without guessed endpoints or unstable UX

### Intel-native portal search is only restored after real verification
Status: `Blocked`

Outcome:
- do not ship guessed Intel portal search behavior

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Re-check local Intel references for a real search endpoint | Done | local references still do not expose one |
| Keep Intel-native portal search disabled until live verification exists | Blocked | no verified live Intel request path |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Old `/r/getPortalSearch` assumption was wrong | Reverted | treat as invalid until proven otherwise |

### Mobile shell wording feels cleaner without getting heavier
Status: `Done`

Outcome:
- improve wording while preserving compact mobile layout

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Rename `Comm` to `COMM` | Done | topbar/menu wording pass |
| Rename score labels | Done | `Global Scoreboard`, `Region Scores` |
| Rename menu utility labels | Done | `Passcodes`, `Map Style`, `Diagnostics` |
| Clean up map mode toggle wording | Done | `Use Intel Map` / `Use IRIS Map` |

### Search UX should explain current scope better
Status: `Done`

Outcome:
- make it clear that search currently means coordinates/location search, not Intel portal-name search

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Clarify search UX in topbar | Done | placeholder and error wording now keep search scoped to place/coordinate search without implying hidden Intel portal-name UI |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Search can be misunderstood as portal-name search | Done | verified current topbar wording keeps search scoped to place and coordinate lookup |

### Portal details show the portal facts we can derive confidently
Status: `Done`

Outcome:
- improve portal details without destabilizing mobile interaction or changing the popup model

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Keep shared popup interaction model | Done | no MapLibre popup migration |
| Reorder portal sections | Done | `MODS` now appears above `RESONATORS` |
| Add links and energy summary | Done | now shows links in, links out, and energy current/max from existing store data |
| Compact popup layout polish | Done | keep descriptive labels; use tighter summary/details tables without changing popup ownership |
| Fix mobile two-column layout for tables | Done | summary and details tables now stay 2-column on mobile |

### Faction and player styling is consistent
Status: `Done`

Outcome:
- improve faction normalization and ensure table layout is mobile-safe

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Fix mobile two-column layout for tables | Done | summary and details tables now stay 2-column on mobile |
| Refactor `normalizeTeam` logic | Done | strictly improved mapping for ENLIGHTENED, RESISTANCE, and MACHINA (M) |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| MapLibre portal popup experiment broke mobile portal clicks | Reverted | experiment reverted; shared `PortalInfoPopup` restored |
| Player-tracker popup behavior was affected during the same experiment | Reverted | resolved by reverting the experiment |

### Map state is persistent and context-aware
Status: `Done`

Outcome:
- map location and zoom survive page reloads
- map center is translated into a human-readable address
- Intel search jumps are synchronized to the IRIS state

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Persist map state to localStorage | Done | lat, lng, and zoom are now persistent |
| Implement reverse geocoding | Done | uses Nominatim API with 1s debounce and precision throttling |
| Sync Intel search moves | Done | hooked Google Maps `idle` event to capture search jumps |
| Visualize address status in Diagnostics Popup | Done | shows stale/resolving states and a debounce countdown |
| Persist resolved address and geocode metadata | Done | top-level persistence ensures "instant" UI on reload |
| Enable/Disable Map Rotation and Pitch | Done | add setting to store; integrated into "Map Style" popup |
| Fix map zoom "bounce" effect | Done | removed rounding/zoom-floor and added snap-prevention |
| Keep persisted `mapState` authoritative on startup | Done | split Intel startup position from later Intel sync so reload now prefers persisted camera without using `lastResolvedLatLng` as camera state |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Viewport missions popup can stay stuck on "Move the map once" after pan | Done | preserving existing `mapState.bounds` when sync updates arrive without bounds keeps viewport missions available after pan/startup sync |

### Portal details show richer derived stats after targeted investigation
Status: `Open`

Outcome:
- investigate whether more Intel-like derived portal stats can be shown safely

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Investigate shielding/mitigation summary from mod stats | Open | possible if shield stats are reliable in current payloads |
| Investigate AP gain presentation | Open | needs a clear definition; not a native portal-details field today |
| Investigate hack-rate or hacks-per-minute presentation | Open | needs confirmation of available mod/stat inputs before adding |

### Deferred refactor notes for missions and startup sync
Status: `Open`

Outcome:
- keep follow-up architecture ideas visible without treating them as active bugfix work

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Refactor missions state model | Open | separate viewport missions, portal missions, selected mission details, and rendered route ownership more explicitly if missions behavior grows more complex |
| Rework missions popup request flow | Open | consider dedupe/caching/open-trigger discipline if repeated popup-driven requests become noisy or harder to reason about |
| Simplify startup sync ownership | Open | current startup behavior is improved, but persisted IRIS state, Intel startup cookies, Intel idle sync, and entity fallback still deserve a clearer long-term contract if another concrete bug appears |

### Deferred refactor notes for map/render/store boundaries
Status: `Open`

Outcome:
- capture medium-sized cleanup ideas before they turn into bug-driven emergency work

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Split map sync store actions by intent | Open | separate bounded viewport updates, unbounded Intel sync updates, and startup restore so camera/bounds ownership is explicit instead of inferred from optional params |
| Make plugin HTML markers a first-class rendering path | Open | player-tracker currently relies on GeoJSON features plus special-case HTML marker handling in `MapOverlay`; a dedicated plugin overlay path would reduce renderer coupling |
| Isolate reverse-geocode state into a dedicated module or slice | Open | `discoveredLocation`, `lastResolvedLatLng`, `addressStatus`, and debounce timing are coherent now but still spread across the main UI slice |
| Tighten IRIS message-type contracts for map sync | Open | startup Intel position, later Intel sync, and IRIS-owned camera moves now differ semantically and should stay explicit in the bridge protocol |
| Extract MapLibre interaction handler logic behind a helper | Open | rotate/pitch support currently touches MapLibre handler internals directly in `MapOverlay`; isolating that would reduce component complexity and future upgrade risk |
| Keep mock fixtures out of release bundles | Open | debug mock fixtures currently ship because JSON fixtures are imported by runtime code; later cleanup should gate mocks behind a dev-only build flag or separate debug-only entry path, and sanitize captured payloads so player-specific metadata (for example `playerData.nickname`) is not kept unless required for UI behavior |
| Stage entity relationship cleanup before any full entity-store rewrite | Open | keep the current split `portals`/`links`/`fields` model for now, but incrementally add relationship-aware cleanup: portal delete should remove attached links now, and later investigate storing field anchor portal ids or secondary indexes before considering a broader normalized graph refactor |
| Investigate heuristic stale-portal repair from link/field contradictions | Open | debug-only first: detect links or fields whose team contradicts currently stored anchor portal teams; if reliable, consider an opt-in inferred-team repair path instead of silently rewriting portal teams |

### Entity cleanup and endpoint diagnostics are more relationship-aware
Status: `In Progress`

Outcome:
- store enough relationship data to clean up stale geometry more safely
- make endpoint timing easier to inspect during runtime debugging

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Preserve field anchor portal ids from `getEntities` | Done | field points now retain `portalId` instead of only lat/lng |
| Remove links attached to a deleted portal | Done | store cascade now removes dependent links when a portal GUID is deleted |
| Remove fields anchored to a deleted portal | Done | field cleanup now uses stored anchor portal ids |
| Add regression coverage for portal-delete cascades | Done | Vitest covers both link and field cleanup when a portal is deleted |
| Show endpoint next-refresh timing in status UI | Done | polled endpoints now expose `next auto refresh`, while `entities` is labeled event-driven |
| Keep endpoint ordering stable but useful | Done | expanded status and diagnostics now sort active first, then auto-refresh by due time, then event-driven, then on-demand |

## Draw Tools Plugin
Status: `In Progress`

Goal:
- add a draw-tools style planning plugin inspired by community references, especially the breunigs lineage and `quick-draw-links`

### Draw tools scope is defined from real community references
Status: `Done`

Outcome:
- define the real feature baseline before implementation, instead of guessing from memory

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Review `draw-tools-plus` reference | Done | confirms helper API for polyline, polygon, circle, marker; not the main planning UX |
| Review `quick-draw-links` reference | Done | confirms richer planning UX: portal-to-portal links, move/copy, crosslinks, great circles, fields, storage/export |
| Decide primary reference | Done | `quick-draw-links` should drive planning workflow; `draw-tools-plus` is secondary inspiration only |

### Draw tools baseline supports portal planning first
Status: `Open`

Outcome:
- provide a planning workflow for hypothetical links and shapes without coupling it into Intel-core UI

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Add a plugin entrypoint and toolbar/menu affordance | Open | should live in plugin architecture, not Intel-core shell |
| Support planned link creation between portals | Open | primary planning action; portal to portal |
| Support removing planned links | Open | should be a first-class edit/delete flow, not manual data cleanup |
| Show crossing links against a hypothetical link | Open | core planning value; compare against visible Intel links first |
| Decide whether crosslink display should also compare against drawn links | Open | `quick-draw-links` supports existing, drawn, or both |
| Support moving or copying links from one anchor portal to another | Open | useful for fast route/plan variants if interaction model stays understandable on mobile |

### Draw tools baseline supports non-link geometry carefully
Status: `Open`

Outcome:
- add the geometry that is useful for planning without turning the plugin into a cluttered desktop-only tool

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Support polygon or field-style drawing | Open | reference plugin derives fields from drawn links; need to decide direct polygon drawing vs derived fields |
| Support circle drawing | Open | useful for radius-based planning and crossing-link inspection |
| Support free marker placement | Open | useful as annotations or temporary plan anchors |
| Decide whether a separate shard/arrow tool is really needed | Investigating | user idea is plausible, but reference evidence is weaker than for links/circles/markers |
| Keep mobile interaction compact | Open | avoid a desktop-heavy control surface |

### Draw tools data and project workflow are durable
Status: `Open`

Outcome:
- drawings should survive reloads and support project-style planning

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Decide storage model for drawn items | Open | local persistence is expected; reference plugin stores projects in localStorage |
| Support store/restore of named projects | Open | explicit project save/restore is part of the reference value |
| Support export of drawn-plan data | Open | reference plugin exports data and portal/link summaries |
| Decide whether import is needed in the baseline | Open | may be phase 2 of the plugin rather than baseline |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Tool scope can sprawl quickly on mobile | Open | link planning is clear; too many modes will make the UI heavy fast |
| Crosslink logic depends on visible map state and zoom | Open | reference plugin warns that visible range and zoom affect crosslink detection |

## Data Contracts And Persistence
Status: `In Progress`

Goal:
- improve type safety, parser confidence, storage boundaries, and bridge discipline

### Payload typing is stronger in cast-heavy domains
Status: `In Progress`

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Payload typing pass | In Progress | missions-list, artifacts, scores completed; store/coordinator update in progress |

### Storage boundaries are clearer
Status: `Done`

Outcome:
- ensure critical settings survive sessions

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Storage boundary design pass | Done | added allowRotation and allowPitch to persisted state |

## Diagnostics and Observability
Status: `In Progress`

Goal:
- improve visibility into runtime behavior and user interactions

### User interaction logging
Status: `Done`

Outcome:
- capture and visualize user map interactions to help debug state sync and performance

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Log map panning events | Done | won't do for now |
| Log map zoom events | Done | won't do for now |
| Visualize interaction history in Diagnostics Popup | Done | won't do for now |

## Semantic UI Cleanup
Status: `Done`

Goal:
- move semantic colors and UI semantics into clearer shared modules

### UI components follow a CSS-first styling policy
Status: `Done`

Outcome:
- eliminate inline `style={{...}}` blocks for static layout and design
- improve reusability and theming consistency across the monorepo
- enable advanced CSS features (hover, active, media queries) for all components
- standardize popup positioning and padding
- introduce generalized design system for inputs, buttons, and choice items

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Add className support to base Popup component | Done | verified in Diagnostics and Map themes |
| Refactor Diagnostics Popup to pure CSS | Done | migrated to debug.css |
| Refactor Portal Info Popup to pure CSS | Done | migrated to portal.css; uses CSS variables for faction/level colors |
| Refactor COMM / Passcode Popups to pure CSS | Done | migrated to comm.css and passcodes.css |
| Refactor Inventory / Missions Popups to pure CSS | Done | migrated to inventory.css and missions.css |
| Standardize common utility classes in base.css | Done | added flex, gap, margin, and text utilities |
| Generalize popup styling in base.css | Done | base `.iris-popup` handles standard padding and variables |
| Unify popup width and centering | Done | all major popups use `iris-popup-center iris-popup-medium` |
| Fix inconsistent popup internal padding | Done | moved padding to .iris-popup-content; standardized internal spacing for major domains |
| Standardize input and button styling | Done | introduced .iris-input and .iris-button in base.css |
| Generalize choice item styling | Done | introduced .iris-choice-item for boxed interactive labels |

### Semantic colors are shared instead of locally improvised
Status: `Open`

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Formal semantic color module | Open | centralize faction, level, rarity semantics |
| Reduce hard-coded semantic colors in CSS/components | Open | follow-up cleanup after module exists |

## Engineering Standards and Design Patterns
Status: `In Progress`

Goal:
- ensure codebase consistency, maintainability, and performance through strictly followed patterns

### Core UI and Styling Principles
Status: `Done`

Outcome:
- predictable, themeable, and mobile-ready UI components
- consistent pattern for inputs, buttons, and boxed choice items

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| CSS-First Styling Policy | Done | prefer CSS classes and variables over inline `style` objects |
| Mobile-First Layouts | Done | assume narrow screens; use 90vw width and centering for small viewports |
| Centered Modal Pattern | Done | major interactions (Comm, Inventory, Missions) use a centered modal feel |
| Theme variable usage | Done | define dynamic properties in `base.css` to satisfy IDE and maintain consistency |
| Choice Item Pattern | Done | standardized boxed labels with consistent hover/active feedback |

### Architectural Patterns
Status: `In Progress`

Outcome:
- clean boundaries between interception, state, and presentation layers

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Zustand for Global State | Done | centralized stores in `@iris/core`; component-level selectors |
| Message-based IPC | Done | content script communicates with interceptor via standard `postMessage` protocol |
| Surgical Interception | Done | intercept network traffic without modifying Intel's internal logic |
| Type-Safe Domain Models | Open | strictly type all incoming Intel payloads to prevent runtime casting errors |

### Linting and Code Quality
Status: `Done`

Outcome:
- automated verification of CSS health and standards
- normalized CSS across the monorepo

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Add Stylelint to monorepo | Done | established root `.stylelintrc.json` and `.stylelintignore` |
| Standardize CSS properties and colors | Done | full pass with `stylelint --fix` to normalize hex and notation |
| Replace deprecated `word-break: break-word` | Done | migrated to `overflow-wrap: anywhere` in all domains |
| Include CSS linting in CI/release | Done | integrated into `npm run lint` and verified in GitHub Actions |

## Current Next Pickup

1. Turn the draw-tools epic into an implementation plan for the first mobile-safe baseline.
2. Keep the startup duplicate score/subscription burst tracked, but do not block other work on it.
3. Investigate richer portal-details stats only after deciding which ones are truly defensible.

## Snapshot And Reference Sources

Active tracker:
- [`docs/WORK_ITEMS.md`](/Users/jula/ittca/docs/WORK_ITEMS.md)

Dated snapshot set:
- [`docs/20260402/IITC-PLAN.md`](/Users/jula/ittca/docs/20260402/IITC-PLAN.md)
- [`docs/20260402/IITC-PLAN_PHASE-1.md`](/Users/jula/ittca/docs/20260402/IITC-PLAN_PHASE-1.md)
- [`docs/20260402/FINDINGS-IITC_GAPS.md`](/Users/jula/ittca/docs/20260402/FINDINGS-IITC_GAPS.md)
- [`docs/20260402/UI_REVIEW_INTEL_FIRST.md`](/Users/jula/ittca/docs/20260402/UI_REVIEW_INTEL_FIRST.md)
