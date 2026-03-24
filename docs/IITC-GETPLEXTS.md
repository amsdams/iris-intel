# IITC `getPlexts` Chat Engine Reference

> Reference document for AI-assisted development against the IITC (Ingress Intel Total Conversion) chat pipeline.
> IITC initializes `getPlexts` requests through its own Chat Engine rather than intercepting them from the vanilla Intel site.

---

## 1. The Trigger — When Requests Fire

IITC requests `getPlexts` in three specific scenarios:

| Trigger | Description |
|---|---|
| **Initial load** | Immediately after the map successfully authenticates and the first set of portal data is received |
| **Periodic polling** | Every 15–60 seconds while the tab is active. Frequency varies by chat tab: "Faction" polls more aggressively than "All" to reduce server load |
| **Manual refresh** | Triggered when the user opens the COMM pane, or manually drags/refreshes the map view |

---

## 2. The Logic — How Requests Are Built

The request is handled by a core function (historically `window.chat.request()` in classic IITC; refactored in IITC-CE Community Edition — verify the current function path against the active build).

### Flow

1. **Coordinate calculation** — Grabs current map boundaries (`minLatE6`, `maxLatE6`, `minLngE6`, `maxLngE6`) so only chat relevant to the visible area is requested.
2. **Timestamp management** — Maintains a `minTimestampMs` variable. Each new request only asks for messages *after* the last received message, avoiding duplicate data. An agent consuming this stream should treat it as an incremental feed, not a full snapshot.
3. **Authentication injection** — Automatically attaches the required CSRF token (`X-CsrfToken`) and session cookie (`SACSID`) from browser storage. These are injected per-request and are not stored in the IITC plugin layer.
4. **AJAX POST** — Sends a JSON payload to `https://intel.ingress.com`.

### Request Payload Parameters

| Parameter | Type | Notes |
|---|---|---|
| `v` | string | Version hash — changes with Niantic deploys; must be kept current |
| `tab` | string | `"all"` or `"faction"` |
| `minLatE6` | integer | South boundary of visible map (latitude × 1,000,000) |
| `maxLatE6` | integer | North boundary |
| `minLngE6` | integer | West boundary (longitude × 1,000,000) |
| `maxLngE6` | integer | East boundary |
| `minTimestampMs` | integer | Unix timestamp in ms — only return messages after this point |
| `maxTimestampMs` | integer | Usually `-1` (no upper bound) |
| `ascendingTimestampOrder` | boolean | Usually `true` — payload arrives oldest-first |

---

## 3. The Response — Plext Structure

`getPlexts` returns an array of **plexts**. Each plext is not necessarily a chat message — the type must be checked before processing.

### Plext types (`plext.plextType`)

| Type | Description |
|---|---|
| `PLAYER_GENERATED` | A real chat message typed by an agent |
| `SYSTEM_BROADCAST` | A game event — portal captured, link created, field destroyed, etc. |
| `SYSTEM_NARROWCAST` | A game event visible only to the relevant faction |

### Key fields per plext

```json
{
  "guid": "unique-plext-id",
  "timestampMs": 1700000000000,
  "plext": {
    "plextType": "PLAYER_GENERATED",
    "team": "ENLIGHTENED",
    "text": "full plain-text content of the message",
    "markup": [
      ["PLAYER", { "plain": "AgentName", "team": "ENLIGHTENED" }],
      ["TEXT",   { "plain": ": hello world" }]
    ]
  }
}
```

### `markup` array

The `markup` array is the structured version of the message. Each entry is a `[type, data]` tuple. Types include:

| Markup type | Description |
|---|---|
| `PLAYER` | An agent name, with faction team attached |
| `TEXT` | Plain text segment |
| `PORTAL` | A portal reference — includes `name`, `address`, `latE6`, `lngE6` |
| `FACTION` | Faction label (Enlightened / Resistance) |
| `AT_PLAYER` | An @mention of another agent |

> Prefer `markup` over `text` when building structured renderers — it gives you typed, linkable entities rather than a raw string.

---

## 4. Mobile Differences (Firefox Nightly + IITC Mobile)

| Behaviour | Detail |
|---|---|
| **Background throttling** | If the Firefox tab is not in the foreground, IITC typically pauses `getPlexts` polling to save battery. An agent should not assume a continuous stream when processing mobile-sourced data. |
| **User-Agent spoofing** | Mobile IITC often sends a desktop User-Agent string to prevent Niantic servers from rejecting the request. The actual client may be mobile even if the UA says otherwise. |

---

## 5. Key Behaviours for Agent Development

- **Incremental stream, not a snapshot** — `minTimestampMs` means each response is a delta. An agent must accumulate messages across responses, not replace the previous set.
- **Oldest-first ordering** — With `ascendingTimestampOrder: true`, process the array from index 0 upward. Index 0 is the oldest message in the batch.
- **Deduplication by GUID** — Network retries or overlapping poll windows can produce duplicate plexts. Always deduplicate on `guid` before storing or displaying.
- **Tab scope** — `"all"` and `"faction"` are independent request streams with separate `minTimestampMs` cursors. Treat them as two separate channels.
- **Coordinate scope** — Messages are bounded by the visible map area. Panning the map changes the bounding box, which may return previously unseen messages from the new area — this is not a replay error.
- **Version hash (`v`)** — The `v` parameter changes when Niantic deploys updates. If requests start returning auth errors or empty responses, the hash is likely stale and needs to be re-extracted from the page source.
- **Auth is ephemeral** — `SACSID` session cookies expire. An agent orchestrating requests should handle 401/403 responses gracefully and surface a re-authentication prompt rather than silently failing.
- **IITC-CE vs classic IITC** — The community edition (IITC-CE) has refactored the chat module. Function paths like `window.chat.request()` may differ. Verify against the active plugin source before hooking into internals.

---

## 6. Related Intel Endpoint Context

| Endpoint | Purpose |
|---|---|
| `getPlexts` | Chat messages and game events (this document) |
| `getEntities` | Portal data, links, fields for the visible map area |
| `getGameScore` | Current global MU score per faction |
| `redeemReward` | Passcode redemption |

All endpoints share the same base URL (`https://intel.ingress.com`), the same `v` version hash, and the same auth headers (`X-CsrfToken` + `SACSID`).
