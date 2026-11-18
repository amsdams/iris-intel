# Changelog

Notable changes, newest first. App changes use versions; website and maintenance work use dated entries.
Unreleased is reserved for changes awaiting publication. Alpha app builds are shared through the rolling
[latest release](https://github.com/amsdams/iris-intel/releases/tag/latest); these are not stable releases.
Earlier prototype entries record development/testing milestones; 0.5.0 aligns Android and browser versions.

## 2026-11-18 — Dependency and Android maintenance

- Updated compatible Playwright, ESLint, typescript-eslint and MapLibre dependencies, including MapLibre's new dependency notice.
- Updated the Android Gradle wrapper to 8.14.7 for upstream security fixes, retaining AGP 8.13.2 and JDK 21.
- Added grouped Dependabot updates for npm workspaces, Android Gradle/wrapper and pinned GitHub Actions; major upgrades remain manual.
- Renamed the Android project folder to `apps/android` and kept CI support for older release tags.

## 2026-11-14 — Website and maintenance

- Clarified the homepage and README: integrated planning tools, a current Android download under 1 MB, and explicit alpha, plugin and iOS limits.
- Standardized the public description as “IRIS — Ingress Intel map for Android and browsers,” with IITC origins explained in the body text and credits.
- Published the [project homepage](https://amsdams.github.io/iris-intel/) with download, installation and privacy links; added GitHub discovery topics.
- Organized browser tests by behavior with shared strict request/error fixtures and navigation helpers; added quick smoke checks and browser-test linting while retaining regression coverage.
- CI now runs browser smoke before packaging, reuses verified web assets and caches Gradle dependencies; documentation/site-only changes skip app builds and signing without overlooking earlier unbuilt changes.
- Consolidated project goals, definition of done, roadmap and contributor procedures; retired redundant plans and feature inventories.
- Preserved IITC-CE core and relevant plugins as the behavioral reference, with explicit reasons and validation for intentional deviations.

## 0.6.0 — 2026-11-14

Published friends alpha; Android version base: `0.6.0-alpha`.

- More room in panels: request timings and technical metadata are grouped under System → Diagnostics → Panel details.
- Compact panel headers, an always-visible COMM summary, consistent scrollbars and simpler scrolling.
- Clearer Inventory totals/selected keys, mission source selection and list priorities; quieter surfaces and better long-name wrapping.
- Keyboard/safe-area-aware panels, a larger-text preference and clearer section headings.
- Compact Layers controls, focused Profile progress and meaningful initial/reward states.
- Data freshness/cache labels, feedback beside portal copy actions, and improved image-preview focus/closing behavior.

## 2026-11-13 — CI portability

- Fixed clean-checkout GitHub builds by replacing portal-statistics tests that required the ignored local IITC reference checkout with self-contained regression cases. IITC remains the behavioral reference.

## 0.5.0 — 2026-11-13

Published alpha, now superseded; Android version base: `0.5.0-alpha`.

- Clearer phone navigation, grouped Analysis/Draw tools, scroll hints and expandable panels.
- Portal Zoom, Navigate and Share actions; compact owner/health/resonator/key summary and cleaner statistics.
- Portal locations in Google Maps, Bing and OpenStreetMap, explicit OSM directions, and Android maps-app handoff.
- Ingress Prime links and local QR sharing; portal access/link-range circles and richer AP, energy and hack statistics.
- Full regional scoreboard with checkpoint history, charts and projections; global scores and ranked agents up front.
- Cancelled Scores requests recover on reopen; late failures cannot replace newer score or portal-detail results.
- More space for COMM, clearer active filters and errors, with technical information at the bottom.
- Consistent header spacing, readable touch controls and softer dark headers; fixes for Back/menu behavior and portal reading-position restoration.
- Updated compatible dependencies and addressed development-tool advisories; expanded browser and Android regression coverage.

## 0.4.1-alpha — 2026-10-21 to 2026-11-06

- Manual Android update checks and a direct link to the latest release.
- Portal-linked COMM activity, search/filtering of loaded messages and saved COMM views.
- Fresher map and player activity, improved search navigation, smoother labels and more reliable map recovery.
- Corrected Machina agent-name colors in COMM, including messages tagged neutral.
- Safer map replacement and late artifact responses, with clearer runtime ownership and more resilient local preference storage.
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
