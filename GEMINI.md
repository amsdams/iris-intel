# IRIS Project Mandates

This file contains foundational instructions and preferences for the IRIS development workflow.

## Technical Integrity
- **Validation:** Always verify library-specific API properties (e.g., MapLibre style specifications, Preact hook signatures) against official documentation or existing codebase patterns before implementation to prevent runtime errors.
- **Linting Discipline:** After every code change, fix ESLint errors in affected files before finishing the task.
- **Typecheck Discipline:** After every code change, run `npm run typecheck` from the project root and resolve TypeScript errors before finishing the task.
- **Build Verification:** After every code change, run `npm run build` from the project root and resolve build failures before finishing the task.
- **Post-Change Release:** Always execute `npm run release` from the project root after completing any code modifications or feature implementations. This ensures the extension packages (`.zip` and `.xpi`) are updated for both Chrome and Firefox.
- **Testing:** Prefer testing changes before committing; do not ask to commit immediately after making changes.
- **Style:** Adhere to Preact (TypeScript) and Zustand state management patterns already established in the `@iris/core` and `@iris/extension` packages.
- **IDE Cleanliness:** Treat IntelliJ/TypeScript warnings as real defects when they point to type unsafety, redundant checks, or avoidable coercions. Keep the IDE warning surface minimal, not just ESLint green.
- **Boolean Defaults:** Avoid redundant `!!value` coercions for `boolean | undefined` state. Prefer `value ?? false` when the intended fallback is false.
- **Type vs Interface:** Use `interface` for plain object contracts and API/domain models. Use `type` for unions, tuples, intersections, and helper compositions. Do not use `interface extends GeoJSON.GeoJsonProperties`; use a `type` intersection instead because `GeoJsonProperties` includes `null`.

## Allowed/Preferred Commands
- **Build & Release:** Use `npm run release` to build both Chrome and Firefox extensions.
- **Development:** Use `npm run dev -w packages/extension` for watching changes.
- **Linting:** Use `npm run lint` or `npx eslint packages/extension/src` for code style checks.
- **Typechecking:** Use `npm run typecheck` for repository-wide TypeScript verification.
- **Testing:** (Add project-specific test commands here as they are established).
