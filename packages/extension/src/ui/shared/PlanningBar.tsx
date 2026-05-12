import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { PlannedMarker, useStore } from '@iris/core';

const MARKER_COLORS: PlannedMarker['color'][] = ['white', 'red', 'blue', 'green'];

export function PlanningBar(): JSX.Element | null {
    const [confirmClear, setConfirmClear] = useState(false);
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
    const planningPortalPath = useStore((state) => state.planningPortalPath);
    const plannedLinks = useStore((state) => state.plannedLinks);
    const plannedMarkers = useStore((state) => state.plannedMarkers);
    const portals = useStore((state) => state.portals);
    const setPlanningMode = useStore((state) => state.setPlanningMode);
    const addPlannedMarker = useStore((state) => state.addPlannedMarker);
    const createPlannedLink = useStore((state) => state.createPlannedLink);
    const undoPlannedItem = useStore((state) => state.undoPlannedItem);
    const clearPlanningSelection = useStore((state) => state.clearPlanningSelection);
    const clearPlannedLinks = useStore((state) => state.clearPlannedLinks);

    if (!planningMode) {
        return null;
    }

    const anchor = planningAnchorPortalId ? portals[planningAnchorPortalId] : null;
    const pathPortalNames = planningPortalPath.map((portalId) => portals[portalId]?.name || 'Unknown portal');
    const linkCountToAdd = Math.max(0, planningPortalPath.length - 1);
    const isMarkerTool = planningTool === 'markers';
    const activePlannedItemCount = isMarkerTool ? plannedMarkers.length : plannedLinks.length;
    const clearDisabled = activePlannedItemCount === 0 && !planningAnchorPortalId && planningPortalPath.length === 0;
    const clearTitle = isMarkerTool ? 'Clear all planned markers' : 'Clear all planned links';
    const handleClear = (): void => {
        if (confirmClear) {
            clearPlannedLinks(planningTool);
            setConfirmClear(false);
            return;
        }

        setConfirmClear(true);
    };

    return (
        <div className="iris-planning-bar">
            <div className="iris-planning-main">
                <span className="iris-planning-kicker">{isMarkerTool ? 'Draw markers' : 'Draw links'}</span>
                <span className="iris-planning-status">
                    {isMarkerTool
                        ? (anchor ? `Portal: ${anchor.name || 'Unknown portal'}` : 'Tap a portal to set target')
                        : pathPortalNames.length > 0
                            ? pathPortalNames.join(' -> ')
                            : 'Tap a portal to set source'}
                </span>
                <span className="iris-planning-status iris-planning-status-secondary">
                    {isMarkerTool
                        ? (anchor ? 'Choose a marker color for this portal' : 'Tap a portal before adding a marker')
                        : linkCountToAdd > 0 ? `Preview shown. Add ${linkCountToAdd === 1 ? 'Link' : 'Links'} to save.` : 'Tap portals to preview links'}
                </span>
                <span className="iris-planning-count">
                    {plannedLinks.length} links · {plannedMarkers.length} markers
                </span>
            </div>
            <div className="iris-planning-actions">
                <div className="iris-planning-action-row iris-planning-action-row-primary">
                    {isMarkerTool && (
                        <div className="iris-planning-marker-group" aria-label="Add portal marker">
                            {MARKER_COLORS.map((color) => (
                                <button
                                    key={color}
                                    className={`iris-planning-marker-btn iris-planning-marker-${color}`}
                                    onClick={() => {
                                        if (!anchor) return;
                                        addPlannedMarker(anchor.lat, anchor.lng, anchor.name || undefined, color, anchor.id);
                                        setConfirmClear(false);
                                    }}
                                    disabled={!anchor}
                                    title={`Add ${color} marker`}
                                />
                            ))}
                        </div>
                    )}
                    {!isMarkerTool && (
                        <button
                            className="iris-planning-btn iris-planning-btn-primary"
                            onClick={() => {
                                createPlannedLink();
                                setConfirmClear(false);
                            }}
                            disabled={linkCountToAdd === 0}
                        >
                            {linkCountToAdd > 1 ? 'Add Links' : 'Add Link'}
                        </button>
                    )}
                    <button className="iris-planning-btn" onClick={() => {
                        setPlanningMode(false);
                        setConfirmClear(false);
                    }}>
                        Close
                    </button>
                </div>
                <div className="iris-planning-action-row iris-planning-action-row-secondary">
                    <button
                        className="iris-planning-btn"
                        onClick={() => {
                            clearPlanningSelection();
                            setConfirmClear(false);
                        }}
                        disabled={!planningAnchorPortalId && planningPortalPath.length === 0}
                    >
                        Reset
                    </button>
                    <button
                        className="iris-planning-btn"
                        onClick={() => {
                            undoPlannedItem(planningTool);
                            setConfirmClear(false);
                        }}
                        disabled={activePlannedItemCount === 0}
                    >
                        Undo
                    </button>
                    <button
                        className={`iris-planning-btn ${confirmClear ? 'iris-planning-btn-danger' : ''}`}
                        onClick={handleClear}
                        disabled={clearDisabled}
                        title={confirmClear ? `Click again to ${clearTitle.toLowerCase()}` : clearTitle}
                    >
                        {confirmClear ? 'Confirm' : 'Clear'}
                    </button>
                </div>
            </div>
        </div>
    );
}
