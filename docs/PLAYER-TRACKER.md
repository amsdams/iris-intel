# Player Tracker Notes

This document records the current understanding of IRIS player tracking versus IITC's `player-activity-tracker`, based on:

- `reference/20260330-iitc/Ingress Intel Map.html`
- `reference/Community-plugins/dist/DanielOnDiordna/player-tracker-addon.user.js`
- `packages/plugins/src/player-tracker/index.ts`

## Current Finding

IRIS is likely drawing too many movement lines.

The safest confirmed reason is not just visual styling or map rendering. It is data ingestion:

- IITC stores per-player event history and compresses events before drawing.
- IRIS currently derives movement lines directly from COMM messages.
- The IRIS plugin subscribes to the full `plexts` array every time it changes.
- Without a processed-id guard, the same plexts can be reprocessed on later updates, generating duplicate lines again.

## IITC Behavior

The embedded IITC `player-activity-tracker` does more than connect consecutive locations:

- skips old data outside the time window
- ignores destroy messages that do not map cleanly to a single player location
- merges same-timestamp events into one event
- skips older events at the same location
- updates timestamps instead of creating a new event when the player remains at the same place
- limits displayed history via `PLAYER_TRACKER_MAX_DISPLAY_EVENTS`

This means IITC tracks an event history model first, then draws lines from that normalized history.

## IRIS Behavior

Current IRIS behavior is simpler:

- one last-known location per player
- every different portal location within the expiration window creates a new dashed line
- all current plexts are revisited on each subscription update unless explicitly guarded

This makes IRIS more prone to overdraw than IITC.

## Safest Fix

The first safe fix is:

1. Track processed plext ids inside the plugin.
2. Only ingest new plexts once.

This does not change the overall IRIS data model and should reduce duplicate line creation immediately.

## Likely Follow-Up Fixes

After the processed-id fix, the next steps should be:

1. Port IITC-style event compression rules into IRIS.
2. Merge same-time and same-location updates instead of always creating a new segment.
3. Add a per-player display limit similar to IITC's `PLAYER_TRACKER_MAX_DISPLAY_EVENTS`.
4. Revisit line color semantics after the tracking logic is stable.
