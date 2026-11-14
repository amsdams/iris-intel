# Deferred menu and tracker requirements

Proposed only; current Panels hides five optional sheets. [The roadmap](../../ROADMAP.md) owns priority.
Revisit implementation details against current code and the IITC doctrine when this work is selected.

## Pinning and presets

- Preserve Selected/Map/Agent/COMM/System and stable IDs. Rename visible Panels to Customize, retaining `panelSettings`.
- Baseline access stays: Search, Layers, Controls, Details, Profile, Inventory, COMM, Appearance, Customize,
  Diagnostics, Shortcuts, About and native recovery. Optional Map IDs: `drawLinks`, `drawMarkers`, `portalCounts`,
  `portalsList`, `scoreboard`, `scores`, `missions`; Agent: `passcode`.
- Use existing registry metadata; pins stay in the secondary row, unpinned tools enter domain-specific More tools.
  Overflow/shortcuts/context still open tools and indicate active state. Missions retains both view/portal source contexts.
- Unpinning changes placement only: no close/cancel, data deletion, layer changes or processing/polling claims.
  Preserve focus/Back and portal section preferences; no automatic preset changes on resize/upgrade.
- Compact pins none; Planning pins all eight; Custom is derived for other sets. Exact sets restore preset labels.
- Proposed `iitc-iris:menu-preferences:v1` stores `{pinnedTools: CustomizableToolId[]}`, never duplicate preset state.
  Normalize duplicates/unknown IDs in registry order; newly introduced optional tools enter overflow for existing users.
- Valid new data wins, including empty pins. Otherwise migrate valid legacy hidden panels to all eight minus hidden IDs;
  missing/unusable preferences default Planning (legacy empty means Planning). Malformed new data may use valid legacy.
  Preserve the old key; do not overwrite corruption during fallback reads. Optional/blocked storage must remain usable.

## Player Tracker activation

- Separate from pinning/visibility; proposed Track players defaults on with explicit storage migration. Existing faction/
  zoom eligibility remains. Off skips location parsing/history allocation, clears visible pins/traces, removes only
  tracker polling interest and preserves retained history. Shared COMM/manual/history/send/portal activity continue.
- Reactivation means **no replay of already observed messages**, not an event-time cutoff. Keep bounded GUID delivery
  exclusions while off and seed from the retained public buffer. Newly observed delayed/older messages remain eligible.
  Use actual `guid`/`time` fields; no invented timestamp/client-clock filter. Define expiry/reset, repeated toggle,
  map replacement and late-response behavior; full reload starts a normal delivery session.
- Guard tracker delivery, not the entire shared public-message callback. No duplicate listeners/pollers or COMM coupling
  to tracker internals. Tests must cover migration/corruption, contextual access, retained buffers and shared consumers.

Analyze optimization separately: menu hiding does not make Portal Analysis lazy. Audit all consumers/invalidation before
changing publication. Draw Tools already skips disabled/empty crossing work; measure remaining costs and equivalent output.
