# IRIS Repository Guide

Read the [project manifest and definition of done](README.md), [contributor procedures](CONTRIBUTING.md),
[IITC porting doctrine](docs/iitc-iris/port-plan.md), [architecture](docs/iitc-iris/architecture.md) and
[current work](docs/ROADMAP.md) as relevant. These documents own their subjects; do not duplicate them here.

**IITC-CE core and relevant plugins are the behavioral reference.** Follow the porting doctrine before changing
behavior; document intentional improvements/deviations explicitly. Earlier IRIS implementations are historical context.

- Active npm workspaces: `apps/iitc-iris` and `packages/iitc-core`; existing native host: `apps/android-intel-spike`.
- Preserve appearance, message/persistence contracts and request lifetimes unless the task authorizes changes.
- Follow CONTRIBUTING's testing matrix: focused checks during edits, broad checks once the batch settles;
  documentation-only edits need whitespace/local-link checks. Build downloads only when requested.
- Preserve Android app ID, release key and monotonic version codes; consult the Android guide before release work.
- Do not commit, merge, tag, push or publish without user authorization. Preserve unrelated edits and ignored captures.
- Keep documentation in its owning guide. Update state instead of adding diaries; preserve doctrine and deliberate
  deviations when shortening documents. Reference checkouts must remain optional for builds and normal tests.
