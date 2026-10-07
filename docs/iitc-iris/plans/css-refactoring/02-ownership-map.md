# IITC-IRIS CSS Ownership Map - Phase 2

## Overview

This document maps CSS selectors to their owning components based on usage analysis. The goal is to identify which CSS belongs where according to the existing source architecture.

## Shared UI Primitives (Global/Reusable)

### Base Classes
- `.iitc-iris-button` → `src/ui/action-button.tsx`
- `.iitc-iris-control` → `src/ui/text-input.tsx`, `src/ui/select-input.tsx`, etc.
- `.iitc-iris-list-item` → Used across multiple panels (search, inventory, missions, comm, draw-tools)
- `.iitc-iris-badge` → `src/ui/badge.tsx`
- `.iitc-iris-panel-header` → `src/ui/panel-header.tsx`
- `.iitc-iris-panel-footer` → `src/ui/panel-footer.tsx`
- `.iitc-iris-empty-state` → `src/ui/empty-state.tsx`

### Component Primitives
- `.iitc-iris-text-input` → `src/ui/text-input.tsx`
- `.iitc-iris-select-input` → `src/ui/select-input.tsx`
- `.iitc-iris-textarea-input` → `src/ui/textarea-input.tsx`
- `.iitc-iris-chip-button` → `src/ui/chip-button.tsx`
- `.iitc-iris-clear-selection` → `src/ui/clear-selection.tsx`
- `.iitc-iris-base-toggle` → `src/ui/base-toggle.tsx`

## Feature-Specific Ownership

### Search
- `.iitc-iris-search-box` → `src/search/search-panel.tsx`
- `.iitc-iris-search-input` → `src/search/search-panel.tsx`
- `.iitc-iris-search-clear` → `src/search/search-panel.tsx`
- `.iitc-iris-search-results` → `src/search/search-panel.tsx`
- `.iitc-iris-search-result-row` → `src/search/search-panel.tsx`
- `.iitc-iris-search-result-heading` → `src/search/search-panel.tsx`
- `.iitc-iris-search-status` → `src/search/search-panel.tsx`

### Inventory
- `.iitc-iris-inventory-row` → `src/side-panels/inventory-panel.tsx`
- `.iitc-iris-inventory-key-row` → `src/side-panels/inventory-panel.tsx`

### Missions
- `.iitc-iris-mission-row` → `src/missions/missions-panel.tsx`

### Communication
- `.iitc-iris-comm-row` → `src/comm/comm-message-list.tsx`

### Draw Tools
- `.iitc-iris-draw-tools-list-item` → `src/draw-tools/draw-tools-panel.tsx`

### Portals (Agent-related)
- `.iitc-iris-agent-card` → `src/portals/agent-card.tsx`
- `.iitc-iris-agent-row` → `src/portals/agent-card.tsx`
- `.iitc-iris-agent-level` → `src/portals/agent-card.tsx`

### Portal Analysis
- `.iitc-iris-analysis-card` → `src/portal-analysis/analysis-card.tsx`
- `.iitc-iris-analysis-row` → `src/portal-analysis/analysis-card.tsx`

## Panel Components

### Main Layout
- `.iitc-iris-shell` → `src/shell/app-shell.tsx`
- `.iitc-iris-map` → `src/map/map-container.tsx`
- `.iitc-iris-panel-container` → `src/ui/panel-container.tsx`

## Utility Classes

### Display/Visibility
- `.iitc-iris-hidden` → Various components
- `.iitc-iris-disabled` → Various components  
- `.iitc-iris-active` → Various components

## Shared Usage Patterns

Several selectors are used across multiple features:
1. `.iitc-iris-list-item` - Used by search, inventory, missions, comm, draw-tools panels
2. `.iitc-iris-control` - Used by various input components
3. `.iitc-iris-button` - Used by various action components

## Ownership Recommendations

Based on the analysis, CSS should be organized as follows:

### Application-wide CSS
- File: `src/styles/global.css` or `src/styles/variables.css`
- Contains: Global variables and base styles that apply across the application

### UI Primitive Components
- File: `src/ui/ui.css` 
- Contains: Shared base classes like `.iitc-iris-button`, `.iitc-iris-control`, `.iitc-iris-list-item`

### Feature-Specific CSS
- Files: `src/search/search-panel.css`, `src/missions/missions-panel.css`, etc.
- Contains: Component-specific styles for each feature

### Panel Components
- File: `src/ui/panel.css`
- Contains: Panel header, footer, container styles

## Verification Status

This ownership map is based on current usage analysis and requires verification through:
1. Component file inspection 
2. Dynamic class construction analysis
3. Cross-feature usage confirmation

The ownership decisions reflect the actual usage patterns rather than assumptions about intended architecture.
