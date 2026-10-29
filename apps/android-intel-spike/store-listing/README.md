# Play Store images

Upload these English listing assets in Play Console:

| Field | File | Format |
| --- | --- | --- |
| App icon | [app-icon-512.png](app-icon-512.png) | 512 × 512, 32-bit RGBA PNG, opaque square artwork |
| Feature graphic | [feature-graphic-1024x500.png](feature-graphic-1024x500.png) | 1024 × 500, 24-bit RGB PNG, no alpha |

Suggested feature-graphic alt text: “IRIS Intel map companion, with connected map points on a dark teal background.”

The selected design is the original cyan I on dark teal. The icon exports the existing Android launcher vector,
without adding a mask, rounded corners or shadows.
The feature graphic uses original abstract map artwork, not live Intel data or a UI screenshot.
Its editable source is [feature-graphic.svg](feature-graphic.svg).

Regenerate the PNGs from the repository root using the existing Playwright dependency and installed Chrome:

```sh
node apps/android-intel-spike/store-listing/render.mjs
```

This reads the launcher vector and feature SVG, renders locally with network requests blocked, and checks dimensions,
PNG color types and upload file-size limits. It does not rebuild or change the app. Keep the generated PNGs in Git
alongside the source so they can be uploaded directly. Requirements: [Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

## Phone screenshots

Captured directly from the connected Android phone on 2026-10-29, around the user-selected Berlin location
`52.515187, 13.459904`. These are actual signed-in app screens with live Intel data, not browser fixtures.

Upload in this order:

| Order | Screenshot | Shows |
| --- | --- | --- |
| 1 | [Map overview](phone/01-map-osm-light.png) | Street-level OpenStreetMap with portals, links and fields; light interface |
| 2 | [Portal details](phone/02-portal-details-light.png) | Portal photo, level, owner, health, resonators, links and mods |
| 3 | [Dark map](phone/03-map-dark.png) | OpenFreeMap Dark with the dark interface |
| 4 | [Appearance](phone/04-appearance-dark.png) | Independent interface-theme and base-map choices |

All four are 1080 × 1920 PNGs (9:16), under 8 MB each. They retain the complete display, including native app chrome,
system bars and map attribution. Public portal agent names appear in details; no profile or private COMM panel was
captured. The phone display was temporarily configured to 1080 × 1920 at density 480 before capture, so the app laid
itself out at this size; the images were not stretched or cropped. Original display settings (1272 × 2800, density
560), light interface and OpenStreetMap were restored afterwards.

To recapture a prepared view with USB debugging authorized:

```sh
/Users/jula/Library/Android/sdk/platform-tools/adb exec-out screencap -p > apps/android-intel-spike/store-listing/phone/01-map-osm-light.png
```

Check the current device resolution before replacing these files. The artwork renderer does not regenerate phone
screenshots. Review captures before uploading, avoid private messages/account details, and do not crop away controls
or attribution to force an aspect ratio. A video can remain empty.
