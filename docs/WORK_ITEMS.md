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
| Inventory polling freshness/in-flight cleanup | Done | inventory no longer polls in the background; popup open and manual refresh now own inventory fetches |
| Reduce `getHasActiveSubscription` polling to Intel-like ownership | Done | recurring subscription polling was removed; inventory open now relies on intercepted Intel state and explicit inventory fetches instead of a heartbeat |
| Passive fetch lifecycle ordering cleanup | Done | `END` no longer lands before `SUCCESS` / `DATA` |
| Keep tracking startup duplicate score/subscription burst | Open | only patch when ownership is clearer |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Initial duplicate `getHasActiveSubscription` / `getGameScore` burst on startup | Open | later polling is single and predictable; tracked refinement, not blocker |
| Player-stats publication is still noisier than ideal | Investigating | materially improved, but still worth keeping disciplined |

### Inventory access and portal key visibility are more Intel-like
Status: `In Progress`

Outcome:
- inventory fetch ownership is now closer to Intel's click-driven flow
- inventory parsing is more deliberate and uses the same client-side derivation path for mock and live payloads
- portal details can show a key count from captured inventory
- empty or missing inventory responses are explained instead of silently reading as zero

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Stop background inventory polling | Done | IRIS no longer polls `getInventory`; popup open and manual refresh own the request |
| Stop background subscription polling | Done | IRIS no longer runs a recurring `getHasActiveSubscription` timer; relies on intercepted Intel state plus inventory fetch flow |
| Refactor inventory categorization out of the popup | Done | parser now owns display-item derivation so mock and live inventory use the same logic |
| Classify live `POWER_CUBE`, `BOOSTED_POWER_CUBE`, and `DRONE` shapes correctly | Done | power cubes and drones are now treated as `POWERUPS` instead of weapons or disappearing |
| Add portal key count to portal details | Done | portal details now shows `Keys` using recursive capsule-aware counting from captured inventory |
| Clarify inventory-not-loaded vs empty-inventory UI | Done | inventory popup and portal details now distinguish loading, not-yet-loaded, unavailable, and numeric states |
| Preserve previous inventory snapshot when Intel returns `{\"result\":[]}` | Done | empty inventory refreshes no longer wipe a previously captured inventory snapshot |
| Refresh inventory mock against saved live payload shapes | Done | mock inventory now includes realistic timed/player powerups, boosted power cube, drone, entitlement, and nested capsule contents |
| Include capsule-contained items in inventory tabs and totals | Done | inventory display derivation now expands capsule contents recursively so popup totals and tabs match portal key counting |
| Keep inventory tab bar visible while switching categories and scrolling | Done | inventory popup now owns the scroll area and the tab strip stays sticky instead of scrolling/clipping away |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| Inventory popup tabs still ignore capsule contents while portal key count includes them | Done | display derivation now expands capsule contents, and grouping keeps capsule monikers distinct |
| Empty `getInventory` responses are ambiguous on Intel | Investigating | IRIS now preserves the previous snapshot and explains the state in UI, but the underlying Intel behavior still needs more live verification |
| Inventory tab bar can disappear after switching categories such as `ALL` or `KEYS` | Done | moved the tab strip into the actual inventory scroll container and kept it sticky there; long-list testing now behaves correctly in `KEYS` and `ALL` |

Improvement ideas:

| Idea | Status | Notes |
| --- | --- | --- |
| Flatten capsule contents into derived inventory display items | Done | inventory popup totals and tabs now include capsule-contained items, aligning display derivation with recursive portal key counting |
| Use Intel-style inventory labels instead of raw enum names | Done | parser now follows the Intel item label mapping from the saved desktop reference, including labels such as `Apex Mod`, `Portal Fracker`, `Ultra Link`, and Intel-style beacon names |
| Sort grouped inventory rows by item count before name/level tiebreaks | Done | inventory popup now offers `COUNT`, `NAME`, and `RARITY` sort chips, with count-first as the default grouped view |
| Preserve rarity through derived inventory items so chips and colours match Intel payloads | Done | capsules, keys, powerups, and level-backed resource items now keep payload rarity for display chips, colour selection, and rarity sorting |
| Prefer level colour first, then rarity colour, before falling back to item-type colour | Done | power cubes, resonators, and XMPs now use level colours, while keys, capsules, hypercubes, fireworks, and beacons use rarity colours when the payload provides it |
| Make category tabs data-aware instead of always showing every tab | Done | inventory tabs now hide empty categories after inventory loads and show per-category item counts |
| Decide whether `ENTITLEMENT` should be hidden, surfaced, or grouped separately | Open | real payloads contain entitlement items; current parser intentionally ignores them |
| Mark preserved inventory snapshots as stale after an empty refresh | Open | the popup now explains the preserved-snapshot behavior, but it still does not track or mark the currently displayed inventory as definitively stale/preserved |
| Add fixture coverage for nested capsule-derived display items | Done | parser tests now cover capsule-contained display derivation, preserved monikers, and recursive portal key counting |
| Make `COUNT` and `RARITY` sorting span the full `ALL` list instead of staying category-first | Done | grouped inventory sorting is now global in `ALL`, with category only used as a final tiebreak |
| Expand rarity sort ordering to cover Intel values such as `VERY_COMMON`, `SPECIAL`, and `EXTREMELY_RARE` | Done | rarity sorting now covers Intel-style values beyond just `AEGIS`, `VERY_RARE`, `RARE`, and `COMMON` |
| Preserve subtype-specific labels when a broad resource type maps to multiple Intel names | Open | current parser lookup is mostly resource-type keyed, so item families that can differ by subtype/displayName still need a more deliberate label policy |
| Add lightweight inventory filtering without changing fetch ownership or parser behavior | Done | popup now supports client-side name/metadata filtering for grouped inventory rows |
| Keep the preserved-snapshot note truthful to the current inventory state | Open | current hint explains the behavior generically, but it is not yet gated on a tracked "showing preserved snapshot" state |

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

### Plugin overlay and highlighter baseline is partially implemented
Status: `In Progress`

Outcome:
- four map-overlay plugins now exist in the local plugin architecture
- plugin feature ownership is per-plugin instead of one shared overwrite bucket
- highlighter semantics are still IRIS-specific and not yet aligned with an IITC-style "selected highlighter" contract

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Add portal level fill plugin | Done | basic point overlay with Ingress level colours exists |
| Add portal health fill plugin | Done | basic point overlay using health thresholds exists |
| Add portal level labels plugin | Done | HTML label markers exist for portal levels |
| Add portal key count labels plugin | Done | inventory-backed HTML labels exist using recursive capsule-aware key counting |
| Merge plugin-rendered features per plugin instead of last-writer-wins | Done | `PluginManager` now stores plugin features by plugin id and publishes a merged collection |
| Extend plugin SDK with portal level/health and inventory access | Done | plugin API now exposes enough state for the current overlay plugins |
| Load the new plugins in the extension runtime | Done | all four plugins are currently registered at startup |
| Let plugins declare safer defaults and lightweight capability hints | Done | manifests can now mark overlay plugins as default-off and label-heavy without forcing a single-highlighter model |
| Keep label-heavy plugin markers hidden until closer zoom | Done | level-label and key-count overlays now stay out of low-zoom views |
| Remove generic popup behavior from non-interactive label overlays | Done | portal key counts and level labels no longer open the plugin feature popup |
| Rename overlay plugins to clearer `Fill` / `Labels` names and align ids/paths | Done | renamed to `portal-level-fill`, `portal-health-fill`, and `portal-key-count-labels`; directory names, ids, and imports now match |
| Decide whether highlighters should be mutually exclusive or just ordinary concurrent plugins | Open | IITC references use a single selected highlighter, but IRIS has not committed to that model yet |
| Separate plugin HTML markers from generic GeoJSON point rendering | Open | current `MapOverlay` support works, but it is still a special-case renderer path |
| Add visibility/zoom guardrails for label-heavy plugins | Done | initial `minZoom` gating now reduces clutter for level labels and key counts |

Bugs:

| Bug | Status | Notes |
| --- | --- | --- |
| New plugins auto-enable on first load even when they add map clutter | Done | overlay/highlighter plugins can now opt into safer default-off startup via manifest metadata |
| Level and recharge overlays can stack visually on the same portal | Investigating | current IRIS model allows concurrent overlays; this may be acceptable, but it needs an explicit product decision |
| HTML marker rendering is coupled to `MapOverlay` internals | Open | functional for now, but still a maintenance risk if more marker-style plugins are added |

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
Status: `In Progress`

Tasks:

| Task | Status | Notes |
| --- | --- | --- |
| Formal semantic color module | In Progress | shared theme tokens now separate `LEVELS`, `ITEM_RARITY`, `MOD_RARITY`, and item-type semantics; continuing to normalize naming and usage boundaries |
| Reduce hard-coded semantic colors in CSS/components | In Progress | portal details, inventory, and passcode rewards now use shared semantic tokens; continue migrating remaining one-off CSS values in status/debug/topbar surfaces |

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
