# IRIS Project Mandates

This file contains foundational instructions and preferences for the IRIS development workflow.

## Development Lifecycle
- **Post-Change Release:** Always execute `npm run release` from the project root after completing any code modifications or feature implementations. This ensures the extension packages (`.zip` and `.xpi`) are updated for both Chrome and Firefox.
- **Testing:** Prefer testing changes before committing; do not ask to commit immediately after making changes.
- **Style:** Adhere to Preact (TypeScript) and Zustand state management patterns already established in the `@iris/core` and `@iris/extension` packages.
