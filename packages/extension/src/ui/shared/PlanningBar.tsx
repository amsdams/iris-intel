import { h, JSX } from 'preact';
import { PlannedMarker, useStore } from '@iris/core';

const MARKER_COLORS: PlannedMarker['color'][] = ['white', 'red', 'blue', 'green'];

export function PlanningBar(): JSX.Element | null {
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
    const plannedLinks = useStore((state) => state.plannedLinks);
    const plannedMarkers = useStore((state) => state.plannedMarkers);
    const portals = useStore((state) => state.portals);
    const setPlanningMode = useStore((state) => state.setPlanningMode);
    const addPlannedMarker = useStore((state) => state.addPlannedMarker);
    const undoPlannedItem = useStore((state) => state.undoPlannedItem);
    const clearPlannedLinks = useStore((state) => state.clearPlannedLinks);

    if (!planningMode) {
        return null;
    }

    const anchor = planningAnchorPortalId ? portals[planningAnchorPortalId] : null;
    const plannedItemCount = plannedLinks.length + plannedMarkers.length;
    const isMarkerTool = planningTool === 'markers';

    return (
        <div className="iris-planning-bar">
            <div className="iris-planning-main">
                <span className="iris-planning-kicker">{isMarkerTool ? 'Draw markers' : 'Draw links'}</span>
                <span className="iris-planning-status">
                    {anchor ? `${isMarkerTool ? 'Portal' : 'Anchor'}: ${anchor.name || 'Unknown portal'}` : 'Tap a portal to set target'}
                </span>
                <span className="iris-planning-status iris-planning-status-secondary">
                    {isMarkerTool
                        ? (anchor ? 'Choose a marker color for this portal' : 'Tap a portal before adding a marker')
                        : (anchor ? 'Tap another portal to create a planned link' : 'Tap a portal to start a planned link')}
                </span>
                <span className="iris-planning-count">
                    {plannedLinks.length} links · {plannedMarkers.length} markers
                </span>
            </div>
            <div className="iris-planning-actions">
                {isMarkerTool && (
                    <div className="iris-planning-marker-group" aria-label="Add portal marker">
                        {MARKER_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`iris-planning-marker-btn iris-planning-marker-${color}`}
                                onClick={() => anchor && addPlannedMarker(anchor.lat, anchor.lng, anchor.name || undefined, color, anchor.id)}
                                disabled={!anchor}
                                title={`Add ${color} marker`}
                            />
                        ))}
                    </div>
                )}
                <button
                    className="iris-planning-btn"
                    onClick={undoPlannedItem}
                    disabled={plannedItemCount === 0}
                >
                    Undo
                </button>
                <button
                    className="iris-planning-btn"
                    onClick={clearPlannedLinks}
                    disabled={plannedItemCount === 0 && !planningAnchorPortalId}
                >
                    Clear
                </button>
                <button className="iris-planning-btn iris-planning-btn-primary" onClick={() => setPlanningMode(false)}>
                    Done
                </button>
            </div>
        </div>
    );
}
