# IITC-IRIS CSS Migration Log - Phase 3

## Migration Plan Overview

This document outlines the planned migration of CSS from `src/iitc-iris.css` to their appropriate ownership locations based on the analysis in Phase 2.

## Migration Strategy

### Phase 1: Shared UI Primitives
Move global/base UI components to `src/ui/ui.css`

Selectors to move:
- `.iitc-iris-button`
- `.iitc-iris-control` 
- `.iitc-iris-list-item`
- `.iitc-iris-badge`
- `.iitc-iris-panel-header`
- `.iitc-iris-panel-footer`
- `.iitc-iris-empty-state`
- `.iitc-iris-text-input`
- `.iitc-iris-select-input`
- `.iitc-iris-textarea-input`
- `.iitc-iris-chip-button`
- `.iitc-iris-clear-selection`
- `.iitc-iris-base-toggle`

### Phase 2: Feature-Specific CSS
Move feature-specific selectors to their respective feature directories

#### Search
- Move all search-related selectors to `src/search/search-panel.css`
- Selectors: `.iitc-iris-search-box`, `.iitc-iris-search-input`, `.iitc-iris-search-clear`, etc.

#### Inventory  
- Move inventory selectors to `src/side-panels/inventory-panel.css`
- Selectors: `.iitc-iris-inventory-row`, `.iitc-iris-inventory-key-row`

#### Missions
- Move mission selectors to `src/missions/missions-panel.css`
- Selectors: `.iitc-iris-mission-row`

#### Communication
- Move comm selectors to `src/comm/comm-panel.css`
- Selectors: `.iitc-iris-comm-row`

#### Draw Tools
- Move draw tools selectors to `src/draw-tools/draw-tools-panel.css`
- Selectors: `.iitc-iris-draw-tools-list-item`

#### Portals (Agent-related)
- Move agent-related selectors to `src/portals/agent-card.css`
- Selectors: `.iitc-iris-agent-card`, `.iitc-iris-agent-row`, `.iitc-iris-agent-level`

#### Portal Analysis
- Move analysis selectors to `src/portal-analysis/analysis-card.css`
- Selectors: `.iitc-iris-analysis-card`, `.iitc-iris-analysis-row`

### Phase 3: Panel Layout Components
Move panel layout styles to appropriate panel files

Selectors to move:
- `.iitc-iris-shell`
- `.iitc-iris-map`
- `.iitc-iris-panel-container`

## Implementation Order

1. Create CSS files in their new locations with appropriate selectors
2. Update imports in content.tsx to import from new locations  
3. Remove moved selectors from `src/iitc-iris.css`
4. Verify no functionality was broken

## Risk Assessment

### Low Risk Items:
- Shared UI primitives that are clearly reusable across features
- Well-defined panel layouts and containers

### Medium Risk Items:
- Selectors that may be used in multiple components but aren't shared by design
- Complex selectors that may have cross-dependencies

### High Risk Items:
- Global styles or variables that affect application-wide behavior  
- Dynamic class construction that's hard to trace
- IITC/Leaflet integration selectors that may be referenced externally

## Verification Requirements

Before considering migration complete:
1. All moved CSS selectors must still be applied correctly
2. No selectors should have been accidentally removed from their owners
3. All imports must work properly in the build process  
4. Application behavior must remain unchanged
5. Type checking and linting must pass

## Phase 3 Status

This document serves as a preliminary migration plan. The actual implementation will be performed in subsequent phases with careful verification of each move.
