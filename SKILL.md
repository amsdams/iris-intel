## IRIS Build Skill

### When to use
- You need to understand or describe how to work inside `/Users/jula/ittca`.
- The user asks for instructions, plans, docs, or tooling tied to this IRIS browser extension stack.
- You need to document a workflow before making code changes.

### What it covers
- Project structure: `packages/extension`, `packages/core`, `packages/plugins`, and related docs under `docs/`.
- Runtime features: session handling, request coordination, mission/COMM UI, passcodes, and theme palette.
- Key assets: mission references (`reference/…`), IITC/IITC-Button analysis, ticket docs (`docs/TICKETS-*`).

### Workflow
1. Open relevant code/docs using `rg` or `sed` to gather context.
2. Update planning docs (`docs/PLAN.md`, tickets) before touching runtime behavior.
3. Use `apply_patch` for manual edits; prefer descriptive commits for feature work.
4. Run `npx tsc --noEmit -p packages/extension/tsconfig.json` after any TypeScript touch.
5. Summarize results referencing files with absolute paths and line numbers.

### Testing & validation
- `npx tsc --noEmit -p packages/extension/tsconfig.json`
- Browser testing via IRIS extension load (not automated).

### Notes
- Avoid linting/deleting unrelated changes. Keep telemetry docs up to date when adding new features.
