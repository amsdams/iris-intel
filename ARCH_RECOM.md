i want to create a modern iitc alternative. it should work on desktop and mobile. with will be a browser extension and possibly using webview. data will be extracted using xhr fetch interception. it will be shared on github as opensource       
project. I am already familiar with typescript and want a light weight framework. do you have any questions for me? would it be possible?

10:08 PM
Yes, absolutely possible — this is a well-trodden path (IITC itself is open source and does exactly this). I have several questions before recommending anything.

While you answer those, here are my other questions in plain text — these shape the architecture significantly:

On XHR interception:

Do you want to intercept Ingress Intel's existing XHR calls passively (read-only, like IITC does), or do you also plan to inject/modify requests? Read-only is far simpler and lower legal risk.
Are you aware Niantic has ToS language against third-party clients? IITC has operated in a grey area for years — are you comfortable with that, or do you want to design with some mitigation in mind?
On the plugin system:

IITC's plugin model is essentially "drop a userscript in" — do you want something more structured (e.g. a declared manifest with versioning, sandboxed iframes, or a proper plugin API)?
On the WebView angle:

When you say "possibly using WebView" — are you thinking a standalone native app wrapper (like a React Native or Capacitor shell) that embeds the Intel map, or a separate companion app that communicates with the browser extension?
On scope for v1:

Should v1 focus purely on portal display / map overlay, or do you want communication features (chat, player tracking) from the start?
Do you have a name in mind, or is that open?
On the GitHub / open source side:

Any preference on licence (MIT, GPL, AGPL)? This matters — AGPL would require anyone using it as a backend to also open source their changes, which affects forks.
Q: Which platforms are your priority? (Select all that apply)
A: Mobile browser (Chrome/Firefox for Android), iOS (WebKit / WKWebView), Firefox desktop, Chrome / Chromium desktop

Q: What is your primary motivation vs. IITC? (Select all that apply)
A: Modern codebase (TypeScript, tooling), Better mobile UX, Lighter / faster performance, More extensible plugin system, Active maintenance (IITC is slow to update)

Q: Map rendering — what matters most to you?
A: Undecided — advise me

10:09 PM
Great answers — all platforms, all motivations. Let me answer the map question properly and then address my follow-up questions before we touch any code.

On map rendering — my recommendation: MapLibre GL JS

Here's why, given your specific goals:

Leaflet	MapLibre GL	Mapbox GL
WebGL (smooth 60fps)	❌	✅	✅
Fully open source	✅	✅	❌ (BSL licence since 2021)
Mobile performance	Acceptable	Excellent	Excellent
Bundle size	~140kb	~280kb	~280kb
TypeScript support	Types via DefinitelyTyped	Native	Native
Tile flexibility	Any	Any	Pushes Mapbox tiles
Plugin ecosystem	Huge (IITC uses it)	Growing fast	Good but commercial
MapLibre is the community fork of Mapbox GL made after Mapbox changed their licence. It's what OpenStreetMap, Felt, and most serious open-source geo projects use now. For a TypeScript project targeting smooth mobile UX, it's the right call. Leaflet would be a step backward — it's canvas/SVG, not WebGL, and struggles on dense portal maps.

Now my remaining questions before recommending an architecture:

And two more I need text answers for:

Licence preference — MIT (most permissive, forks don't have to give back), GPL v3 (forks must stay open source), or AGPL v3 (even server-side forks must open source)? Given this is a community tool competing with a proprietary game, GPL or AGPL tend to keep the ecosystem healthier long-term, but MIT gets more contributions from casual developers.

Name — do you have one, or is that open? It affects repo structure, the manifest, and branding decisions from day one.

Q: XHR interception — what is your intent?
A: Read-only (passively mirror what Intel loads)

Q: Plugin system design for v1?
A: Structured (declared manifest, versioned API)

Q: WebView — what did you have in mind?
A: Just the browser extension — WebView was a loose idea

Q: v1 scope?
A: Minimal proof of concept first

10:11 PM
Perfect. I have everything I need. Let me give you a full architecture recommendation before touching any code.

Architecture Recommendation
Core decisions
XHR interception — content script approach Since you're read-only and browser-extension-only, the cleanest approach is a content script injected into intel.ingress.com that wraps XMLHttpRequest and fetch on the page's window object before the page script runs. This is exactly how IITC does it, and it's the right call — no proxy server, no MITM, just passive observation of network calls the user's own browser is already making.

Framework — Preact + Vite You said lightweight. Preact is React-compatible (same JSX, same hooks, same mental model) at 3kb vs React's 45kb. Vite handles the build pipeline, TypeScript compilation, and extension hot reload via vite-plugin-web-extension. The entire toolchain is modern, well-documented, and has excellent TypeScript support. No heavyweight framework (no Angular, no full React, definitely no Vue for this use case).

Extension structure — Manifest V3 MV3 is the future for all Chromium and Firefox (Firefox now supports MV3 with minor differences). It changes how background scripts work (service workers instead of persistent background pages), which is relevant for your plugin registry. Design for MV3 from day one — porting from MV2 later is painful.

State — Zustand Tiny (1.5kb), no boilerplate, TypeScript-native, works perfectly with Preact. Holds portal data, map state, and plugin registry. No Redux, no Context sprawl.

Repository structure
my-project/
├── packages/
│   ├── extension/          # Browser extension (MV3)
│   │   ├── manifest.json
│   │   ├── src/
│   │   │   ├── background/ # Service worker
│   │   │   ├── content/    # XHR interceptor, injected into intel.ingress.com
│   │   │   ├── ui/         # Preact map UI (sidebar, overlays)
│   │   │   └── core/       # Portal store, plugin registry, type definitions
│   │   └── vite.config.ts
│   ├── plugin-sdk/         # Published separately to npm
│   │   ├── types.ts        # PluginManifest, PortalData, MapAPI interfaces
│   │   └── index.ts
│   └── plugins/            # First-party plugins, also examples for community
│       ├── portal-names/
│       └── heatmap/
├── docs/
├── .github/
│   └── workflows/          # CI: type-check, lint, build, zip release artifacts
├── LICENSE                 # GPL v3 — recommendation below
└── pnpm-workspace.yaml     # Monorepo via pnpm workspaces
A monorepo from day one is the right call here. The plugin SDK needs to be versioned independently from the extension — community plugins will depend on it, and you don't want a breaking SDK change to silently break plugins.

Plugin manifest design (your structured API)
typescript
// packages/plugin-sdk/types.ts

export interface PluginManifest {
id: string;              // e.g. "com.github.yourname.heatmap"
name: string;
version: string;         // semver
minCoreVersion: string;  // semver — ">=0.3.0"
description: string;
author: string;
permissions: PluginPermission[];  // explicit capability declarations
}

export type PluginPermission =
| 'portals:read'         // access portal data from store
| 'map:overlay'          // add layers to the map
| 'ui:sidebar'           // render into sidebar panel
| 'ui:modal'             // open modals
| 'storage:local';       // persist data via extension storage

export interface PluginDefinition {
manifest: PluginManifest;
setup: (api: PluginAPI) => void | Promise<void>;
teardown?: () => void | Promise<void>;
}

export interface PluginAPI {
portals: PortalStoreAPI;
map: MapAPI;
ui: UIAPI;
storage: StorageAPI;
}
```

This is the key structural advantage over IITC's model — plugins declare what they need upfront, the core validates permissions before calling `setup()`, and `teardown()` means plugins can be enabled/disabled at runtime without a page reload.

---

### XHR interception flow
```
intel.ingress.com page loads
│
▼
Content script (runs at document_start)
└── wraps window.XMLHttpRequest and window.fetch
│
▼
Page makes API call to /r/getEntities, /r/getPortalDetails etc.
│
▼
Interceptor captures response JSON
│
▼
Parsed + validated against TypeScript interfaces
│
▼
Dispatched to Zustand portal store
│
▼
Map re-renders, plugins receive updates via subscriptions
The critical detail: the content script must inject the XHR wrapper via a <script> tag into the page's own window context, because content scripts run in an isolated world and cannot directly wrap the page's XMLHttpRequest. This is a one-page-gotcha that trips everyone up — worth noting now.

Mobile story
For Android Chrome/Firefox the browser extension installs normally — no special work needed beyond MV3 compliance. For iOS, browser extensions in Safari require a native app wrapper (Apple mandates this via the Safari Web Extension model using Xcode). That's significant extra work and out of scope for v1. A reasonable v1 mobile story is: Android via Chrome/Firefox extension, iOS deferred to v2.

Licence recommendation — GPL v3
Given this is a community tool, GPL v3 is the right call over MIT:

Anyone who forks and ships a modified version must also open source their changes
The plugin SDK itself should be MIT — you want community plugins to be able to use any licence they like, and the SDK is just interfaces/types anyway
The extension core stays GPL v3
This split (GPL core + MIT SDK) is the same model Firefox and many major open source tools use.

What I'd suggest building first (PoC order)
Repo scaffolding — monorepo, Vite, TypeScript strict mode, MV3 manifest
XHR interceptor — prove you can capture /r/getEntities response data
Portal store — Zustand store, typed portal model
Map rendering — MapLibre GL rendering captured portals as circles
Plugin registry — manifest validation, setup()/teardown() lifecycle
One first-party plugin — e.g. portal names overlay, to prove the SDK works end to end
That's a shippable, demonstrable PoC in roughly that order. Everything after that — UI polish, sidebar, mobile UX, more plugins — builds on a solid foundation.

Ready to start? If so, I'd suggest beginning with step 1: repo scaffolding — pnpm workspaces, vite-plugin-web-extension, TypeScript config, and the MV3 manifest skeleton. Want me to generate that?

