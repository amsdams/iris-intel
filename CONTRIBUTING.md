# Contributing

Start with the [project goal and definition of done](README.md), [roadmap](docs/ROADMAP.md),
[IITC porting doctrine](docs/iitc-iris/port-plan.md) and [architecture](docs/iitc-iris/architecture.md).
Use Node 24 and `npm ci`; commit the root lockfile when dependency resolution changes.

## Development

| Command                               | Purpose                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                         | Watch the extension build; load `apps/iitc-iris/dist` in the browser. |
| `npm run dev:wb` / `npm run build:wb` | Serve/build the component workbench.                                  |
| `npm run build`                       | Build the active core and application workspaces.                     |
| `npm run lint` / `npm run typecheck`  | Workspace lint (including CSS) / types.                               |
| `npm run test -w packages/iitc-core`  | Example focused workspace check.                                      |
| `npm run clean`                       | Remove generated application output.                                  |

Keep appearance, message contracts, persisted keys and lifetimes stable unless the task explicitly changes them.
CI workflow edits must pin external actions to verified commit SHAs with version comments, avoid persisted checkout
credentials, isolate signing secrets from unsigned/PR calls and validate syntax/signing trigger paths.

## Testing

| Change             | Required verification                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only | `git diff --check`; local paths/anchors and incoming links to retired files. No app tests/builds.                                                        |
| Application/core   | Focused tests and affected lint/type checks during editing; `npm run check` when the batch settles.                                                      |
| UI/map behavior    | Use `npm run test:browser:smoke:reuse` or focused cases during iteration; also run the full `npm run test:browser` suite after the related edits settle. |
| Native host        | Appropriate debug/release Android check below; device checks for auth, permissions and WebView behavior.                                                 |

`npm run check` includes release/build/architecture gates, workspace lint/types/tests, browser-test/CSS lint and workbench build.
Run `git diff --check` before handoff. Group cosmetic edits before broad checks. After failures, rerun affected cases
first; repeat broad suites when shared changes or unresolved concerns justify them. Do not write tests that only
repeat markup/style constants. See [browser testing](tests/browser/README.md) for fixture/assertion contracts.
Chrome fixtures do not prove live Intel, Firefox, native keyboard/auth, routing-app or device behavior. Use the
[friends checklist](docs/iitc-iris/friends-testing.md) for device acceptance; compilation alone is not acceptance.

## Packaging and local downloads

Build downloadable artifacts when requested for testing or a release handoff, not after each edit/review.

| Command                                         | Result                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run package` (`npm run release` alias)     | Build Chrome ZIP and Firefox XPI locally; does not publish.                                                      |
| `npm run android:check`                         | Native tests/lint and debug APK.                                                                                 |
| `npm run android:release`                       | Native release tests/lint and signed APK; signing setup required.                                                |
| `npm run android:bundle`                        | Native release tests/lint and signed Play AAB; does not submit it.                                               |
| `npm run serve` (`npm run android:serve` alias) | Existing ZIP/XPI/APK downloads on port 6969; prints a same-Wi-Fi URL, builds nothing. `PORT` overrides the port. |

Extension packages are under `apps/iitc-iris/builds/`, which each packaging run replaces.
Unpacked output is under `apps/iitc-iris/dist/`.
Android output paths, SDK/signing setup and update constraints are in [the Android guide](apps/android/README.md).
Browser builds, extension packaging and Android asset preparation share outputs: run them sequentially.
After a successful build with unchanged production inputs, avoid rebuilding:

```sh
npm run test:browser:reuse -- tests/browser/portal-details.smoke.mjs
npm run package:reuse
IRIS_REUSE_WEB_BUILD=1 npm run android:check
```

Reuse verifies source/configuration/lockfile/environment and output fingerprints; stale or modified assets fail.
Test-only edits do not invalidate production assets. Refresh with `npm run build -w apps/iitc-iris` when needed.
Package/sign once after final validation. An artifact rebuild from validated, unchanged inputs needs freshness/archive
checks rather than another complete test round. Check the requested archive/APK exists and matches the intended version.

## Versioning and releases

Use patch versions for fixes and minor versions for feature batches. Bump on the feature branch before final testing:

```sh
npm run version:bump -- X.Y.Z --no-tag
```

The helper updates root/app versions, manifest and lockfile. Also synchronize Android's version-name base in
`app/build.gradle`, keeping its alpha/source suffix. Always use `--no-tag` during preparation: otherwise the helper
tags the old HEAD. Update Unreleased in CHANGELOG with the version/date when preparing the release.
Compare APK codes with previously shared builds and record overrides in the Android guide; label uncommitted builds
`-dirty`. Preserve app ID, signing key and increasing codes so updates retain data.

After user acceptance, merge the tested version to main; tag the accepted main commit when releasing. Do not commit,
merge, tag, push or publish without authorization. CI checks/packages on main pushes update the existing `latest`
GitHub release; version tags trigger tagged releases. Both publish signed APK plus XPI/ZIP; ordinary Firefox permanent
installation still requires Mozilla signing. Main APKs use `iitc-iris-android.apk`; tagged APKs include the version.
Manual releases require an existing `vX.Y.Z` tag containing Android and build that tag. CI runs browser smoke before
packaging and caches Gradle dependencies; known docs-only changes run validation without artifact/signing jobs.
CI does not publish AABs; see [Play readiness](docs/iitc-iris/plans/play-store-readiness.md) before resuming store work.

## Dependency maintenance

[Dependabot](.github/dependabot.yml) groups weekly npm/workspace and Android Gradle/wrapper updates, plus monthly
GitHub Actions updates, with one open routine PR per ecosystem and a seven-day release cooldown. Major upgrades
are manual, including security fixes that require a major; review alerts separately. npm security PRs have their own group
and bypass the cooldown/schedule when GitHub's dependency graph, Dependabot alerts and security updates are enabled.
Merge after review and existing PR checks; updates are not auto-merged. Keep action SHAs pinned, verify Gradle/AGP/JDK
compatibility and wrapper checksum, and refresh affected notices. Node/JDK major and Android SDK pins stay manual.
Gradle version PRs do not provide security alerts without dependency submission; this project has no submission job.
Use `npm audit` / `npm audit --omit=dev` to distinguish tooling from shipped dependencies; avoid forced fixes/downgrades.

## Documentation maintenance

Done belongs in CHANGELOG, active/future work in the roadmap, lasting rules in their owning guide. Replace stale
entries rather than append session diaries. Create a separate plan only for selected complex work; preserve its
remaining requirements and decisions before retiring it. Do not duplicate source-file inventories, test totals,
artifact hashes, temporary log paths or local download addresses. Keep evidence in reports/CI/review records and
preserve unrelated edits and ignored personal captures. Privacy/attribution and operational compatibility constraints
remain maintained documents even when they overlap product descriptions.
