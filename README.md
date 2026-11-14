# IRIS — Ingress Intel map for Android and browsers

IRIS (Ingress Reconnaissance & Intelligence System) is an independent, open-source Ingress Intel map for Android
and browser extensions. It integrates a focused set of Intel and planning tools into one interface designed for small screens.
It is based on IITC-CE, with an independent mobile interface.
It is a friends alpha, unaffiliated with Niantic. Arbitrary IITC plugin compatibility, a native iOS app and broad
Play distribution are outside the current scope. Android sign-in uses an experimental WebView workaround.

## Download and try

Get builds from [GitHub Releases](https://github.com/amsdams/iris-intel/releases/tag/latest).

| Platform | Package / installation |
| --- | --- |
| Android 8.0+ | `iitc-iris-android.apk` (currently under 1 MB); [installation, updates, recovery and device testing](docs/iitc-iris/friends-testing.md). |
| Chrome / Chromium | Extract `iitc-iris-chrome.zip`; Developer mode → Load unpacked → folder containing `manifest.json`. |
| Firefox | Development `iitc-iris-firefox.xpi`; use `about:debugging` → This Firefox → Load Temporary Add-on. Permanent installation requires signing. |

Open `https://intel.ingress.com/` after loading the extension. IRIS provides portal details, directions/sharing,
missions, inventory, regional scores, COMM, player activity, drawn links/markers and viewport analysis.
It uses live Intel with OSM/OpenFreeMap base maps; UI theme and text size are independent preferences.

[Project website](https://amsdams.github.io/iris-intel/) · [Privacy policy](https://amsdams.github.io/iris-intel/privacy/) ·
[Feedback](https://github.com/amsdams/iris-intel/issues) · [Support/privacy email](mailto:1sos.2play@gmail.com)

## Project setup

Use Node 24 (`nvm use`) and npm. Reference checkouts are optional and must not be required for builds or normal tests.

```sh
npm ci
npm run dev
```

Load `apps/iitc-iris/dist` using Chrome's Load unpacked or Firefox's temporary add-on loader (`manifest.json`).
This is an extension build, not a hosted web page. `npm run dev:wb` opens the component workbench.
Android additionally needs JDK 21 and the SDK described in its guide below.

| Location | Responsibility |
| --- | --- |
| `apps/iitc-iris/` | TypeScript/Preact UI, browser integration and Leaflet runtime. |
| `packages/iitc-core/` | UI-independent parsing, geometry, request/cache planning and domain logic. |
| `apps/android-intel-spike/` | Existing experimental WebView host; outside npm workspaces. |
| `scripts/` | Build, release and Android tooling. |
| `reference/` | Optional, ignored IITC-CE core/plugin comparison checkout. |

## Definition of done

- Agreed acceptance criteria are met; essential actions remain usable on small screens.
- Relevant changes follow the [IITC porting doctrine](docs/iitc-iris/port-plan.md), including core/plugin comparison
  and explicit documentation of improvements or deviations with their reason and validation method.
- Applicable checks pass under [the contributor procedure](CONTRIBUTING.md#testing); live/device claims have matching evidence.
- User-visible changes enter the changelog; affected documentation is updated without duplicating status or code.
- Requested artifacts come from validated inputs. User acceptance precedes merging or publishing.

## Project documents

| Document | Owns |
| --- | --- |
| [Roadmap](docs/ROADMAP.md) | Current state, in progress, next, later and blocked work. |
| [Changelog](CHANGELOG.md) | Done: versions, dates and notable changes. |
| [Contributor guide](CONTRIBUTING.md) | Development, testing, packaging and release procedures. |
| [IITC porting doctrine](docs/iitc-iris/port-plan.md) | Behavioral reference, comparison rules and intentional deviations. |
| [Architecture](docs/iitc-iris/architecture.md) | Package boundaries, ownership, lifetimes and UI contracts. |
| [Browser testing](tests/browser/README.md) | Fixtures, probes and live comparison. |
| [Android development](apps/android-intel-spike/README.md) | SDK, signing, identity and native security boundaries. |
| [Friends testing](docs/iitc-iris/friends-testing.md) | Installation, updates, recovery, device checks and data use. |
| [Menu proposal](docs/iitc-iris/plans/optional-features-plan.md) / [Play checklist](docs/iitc-iris/plans/play-store-readiness.md) | Deferred requirements and distribution blockers. |
| [Payload samples](docs/iitc-iris/fixtures/README.md) | Sanitized reference captures. |

[SKILL.md](SKILL.md) is the agent entry point. Keep each topic in its owning document; code/tests describe
implementation and verified behavior. Earlier applications and retired documentation remain in Git history.

## Attribution

[GPL-3.0](LICENSE). See [Credits](CREDITS.md) and [bundled notices](apps/iitc-iris/assets/licenses/) for IITC,
plugin authors, Leaflet and other sources. Preserve visible About credits and offline notices in both hosts.
