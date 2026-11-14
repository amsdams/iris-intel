# Changelog

Notable changes, newest first. Dates mark development/test milestones, not necessarily public releases.
Earlier version numbers refer to the Android prototype/alpha; 0.5.0 aligns Android and browser version numbering.

## Unreleased

- Added a public project homepage with download, installation and privacy links.
- Consolidated browser regression fixtures/navigation and organized suites by behavior; added quick browser smoke checks, docs-only CI gating, verified build reuse and Gradle dependency caching.
- Simplified documentation around project goals, definition of done, roadmap and contributor procedures; retired redundant plans and feature inventories.
- Made IITC-CE core and relevant plugins the explicit behavioral reference, with documented reasons and validation for intentional deviations.

## 0.6.0 — 2026-11-14

Local alpha test candidate; Android version: 0.6.0-alpha.

- More room in panels: request timings and technical metadata are grouped under System → Diagnostics → Panel details.
- Compact panel headers, an always-visible COMM summary, consistent scrollbars and simpler scrolling.
- Clearer Inventory totals/selected keys, mission source selection and list priorities; quieter surfaces and better long-name wrapping.
- Keyboard/safe-area-aware panels, a larger-text preference and clearer section headings.
- Compact Layers controls, focused Profile progress and meaningful initial/reward states.
- Data freshness/cache labels, feedback beside portal copy actions, and improved image-preview focus/closing behavior.

## 0.5.0 — 2026-11-13

Local alpha verification build; Android version: 0.5.0-alpha.

- Clearer phone navigation, grouped Analysis/Draw tools, scroll hints and expandable panels.
- Portal Zoom, Navigate and Share actions; compact owner/health/resonator/key summary and cleaner statistics.
- Portal locations in Google Maps, Bing and OpenStreetMap, explicit OSM directions, and Android maps-app handoff.
- Ingress Prime links and local QR sharing; portal access/link-range circles and richer AP, energy and hack statistics.
- Full regional scoreboard with checkpoint history, charts and projections; global scores and ranked agents up front.
- More space for COMM, clearer active filters and errors, with technical information at the bottom.
- Consistent header spacing, readable touch controls and softer dark headers; fixes for Back/menu behavior and portal reading-position restoration.
- Dependency updates and broader regression coverage for browser and Android workflows.

## 0.4.1-alpha — 2026-10-21 to 2026-11-06

- Manual Android update checks and a direct link to the latest release.
- Portal-linked COMM activity, search/filtering of loaded messages and saved COMM views.
- Fresher map and player activity, improved search navigation, smoother labels and more reliable map recovery.
- Optional panel visibility settings and expanded About/credits information.
- Permanent Android app identity introduced on October 29; older prototype installations became a separate app.

## 0.4.0-alpha — 2026-10-21

- Friends alpha with the IRIS launcher name and a compact App menu for Reload, Recovery, Diagnostics and About.
- System, Dark and Light interface themes, independent of the chosen map style.

## 0.3.6–0.3.8-spike — 2026-10-21

- OpenFreeMap vector styles for dark/light maps, alongside OpenStreetMap.
- First signed Android APKs published alongside browser packages.
- Grouped overlapping player markers: tap a count marker, choose an agent, then inspect their activity.

## 0.3.0–0.3.5-spike — 2026-10-20 to 2026-10-21

- Automatic IRIS startup after sign-in, remembered IRIS/Stock Intel recovery mode, and Android Back/lifecycle handling.
- Locate with on-demand permission prompts and improved denial/retry behavior.
- Regional Google sign-in compatibility fixes and working player-marker popups on phones.

## 0.1.3–0.2.0-spike — 2026-10-20

- First working Android sign-in with a session retained after closing and reopening.
- Bundled IRIS map and UI on Android, including portal details, layers, COMM, missions and inventory.
