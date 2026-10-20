# IITC IRIS Project Guide

Follow [the repository guide](SKILL.md) for ownership, validation, and authorization rules.
Start with the [documentation index](docs/README.md) and [roadmap](docs/iitc-iris/plans/index.md).
For code changes, use existing Preact/TypeScript patterns and keep pure domain logic in `packages/iitc-core`.
Preserve observable behavior and persisted/message contracts unless the authorized task changes them.
