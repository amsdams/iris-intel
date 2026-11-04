# COMM UI And Testing Follow-up — 2026-11-04

The user requested UI consistency first, with a note on test quality, setup and faster feedback. This is a scoped
follow-up to [the COMM implementation](comm-review.md); test-infrastructure work below is planned, not implemented.

## UI Investigation And Changes

The filters already used `TextInput`, `ActionButton`, shared control/input skins and theme variables. The main COMM
panel already used `PanelBody`, `PanelFooter`, `EmptyState`, `StatusText`, segmented controls and summary cells.
The gaps were layout/composition and the new timeline's plain paragraphs/list, rather than missing basic components.

- Keep loaded-message Search full width, with Show/Faction immediately below. Put Action/Agent/Portal in More filters
  and named-view management in Saved views. Show active counts even when collapsed, plus save/apply/delete feedback.
  Keep Reset outside both subsections. This leaves more room for messages in the usual expanded-filter state.
- Reuse `Section`, `ControlRow`, `StatusText` and `Badge`; use `EmptyState` for empty portal activity. Keep the existing
  native selects: there is no shared Select component. Restore native arrows, match field sizes and preserve the
  shared skin that overrides Intel input defaults. A Select wrapper is only worthwhile if a subsequent shared
  behavior needs one; wrapping HTML alone does not solve this UI problem.
- Move the existing portal disclosure-summary skin to `ui/shared/section-summary.css`, preserving its skin and adding
  visible open/closed indicators. Reuse it for filters and portal activity. `Section` is a layout component, not a
  disclosure; native `details/summary` retains keyboard behavior.
- Per user UI feedback, Portal activity sits after Facts (before request diagnostics), remaining available when portal
  detail data is loading/unavailable.
- Portal events use compact date/time, faction-colored actor and an action badge, with expandable original text and
  existing portal action buttons. Keep one portal-body scrollbar instead of a second 300px timeline scroll area.
  Move timeline styling to `comm/portal-activity.css`; COMM list styling no longer owns it.
- Transport, polling, raw tracker input, filter semantics/storage key and public-only timeline scope are preserved.

## Is The Test Setup Correct?

Yes for its stated scope: `npm run check` covers release gates, ESLint, TypeScript, core/app Vitest, CSS lint and the
workbench build. Playwright builds the real extension scripts, injects them into a local Intel-like host, runs the
actual content/page bridge and Leaflet runtime, and isolates storage per test. The host includes deliberately hostile
Intel input defaults, which is useful. Failure screenshots/traces are retained. Browser/package/Android commands
share web outputs and must remain sequential. Chrome-only defaults and one worker are explicit in the config/README.

The setup does **not** establish visual correctness, Firefox/WebView parity or live Intel endpoint compatibility:

| Gap | Evidence / impact | Proposed focused improvement |
| --- | --- | --- |
| Screenshots are attachments, not visual assertions | A passing suite still needed human review to catch black/cyan filter fields. One field's background being non-black does not establish matching styling or contrast. | Compare relevant computed field surfaces/heights in light/dark, check all controls' reachability, then add a small set of stable panel screenshot baselines if maintaining them is worthwhile. |
| Successful filter restore is only partly exercised | The COMM fetch mock is installed after `goto` and disappears on reload; the saved-view test checks restored controls, not filtered rows after reload. | Install a reusable fixture before navigation/reload and assert both restored settings and visible result identities. |
| Preferences edge cases lack direct coverage | Save/apply is covered; malformed/blocked storage, delete/overwrite and the eight-view boundary lack dedicated regressions. | Extract only the preference normalization/storage seam needed for direct tests; add interaction tests for destructive view actions and immediate reload. Avoid tests mirroring JSX structure. |
| Timeline lifecycle coverage is incomplete | Public updates, selection changes, source exclusion and the 100-event cap have coverage. UI empty/long-content/multi-portal states, map replacement, close cleanup and late old-selection messages need explicit cases. | Add small targeted browser cases for these boundaries, asserting subscription messages and absence of new fetches as well as visible contents. |
| Keyboard and small-screen coverage is selective | Filters run in light/dark phone/short landscape; prior timeline coverage checked content only. | Current UI pass adds keyboard event expansion and checks that the timeline has no nested scrollbar. Follow with labelled composer/focus order, Shift-Tab/ambiguous completion, long names and expanded portal activity at narrow sizes. |
| Permissive endpoint defaults can hide missing mocks | Unhandled `/r/` calls return `{result:false}` and external requests get empty HTTP 200 responses. | Make feature fixture endpoints explicit, log unexpected RPC calls and fail on unhandled feature requests. Keep intentional tile/provider suppression explicit. |
| Platform evidence is narrower than shipped targets | Default browser project is installed Chrome; the workbench only auto-discovers `src/ui`, not composed COMM panels. | Run focused Firefox coverage for native control/disclosure changes and retain a real Android smoke checklist. Add composed panel fixtures when needed for fast design work, rather than extending generic workbench props arbitrarily. |

## Faster Feedback Plan

1. During UI edits run the relevant COMM browser file (currently about 8 seconds including build), plus affected lint
   or type checks. Run the full checks and full browser suite once the UI settles. Repeat broad checks only for a new
   failure or a change affecting other areas; shared disclosure CSS justifies the full panel suite in this pass.
2. Keep core/domain tests fast and deterministic. Test preference rules directly; reserve real-browser tests for
   focus, scrolling, persistence integration, message lifetimes and host CSS interactions.
3. Stabilize fixture time, locale and viewport for any visual baselines. Reuse a fixture installed before navigation
   so reload cases exercise the same data. Avoid long sleeps; wait on a particular state or response.
4. If rebuild time becomes material, consider an explicit build-once/test-existing-assets mode with freshness checks.
   The default must still rebuild, so a fast command cannot silently test stale scripts. Do not run packaging/Android
   concurrently against those outputs.
5. Measure before raising worker count. Independent UI files could use a small worker pool; timing/performance probes
   should remain isolated. Split synthetic performance checks from functional smoke if contention proves significant.
6. Package/sign only after the final successful checks and compare bundled assets once. Repeated full suites and APK
   rebuilds during layout iteration were avoidable overhead in the preceding task.

The UI pass does not change Playwright projects, worker count, fixture infrastructure or test dependencies. Broader
testing improvements remain the next engineering task after UI acceptance.

## UI Validation

`npm run check` passes: 689 app/core tests and six release gates, including CSS lint and workbench build. All 61
Chrome browser cases pass after the shared disclosure/UI changes; five focused COMM cases also pass after the
final explanatory-text styling adjustment. Final typecheck, CSS lint and whitespace checks pass. Screenshots were
reviewed for compact filters and expanded portal activity. These are fixture results; phone/live Intel acceptance
remains pending. Build details are recorded in the roadmap.
