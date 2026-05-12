import { h, JSX } from 'preact';
import { useStore } from '@iris/core';

export function PlanningBar(): JSX.Element | null {
    const planningMode = useStore((state) => state.planningMode);
    const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
    const plannedLinks = useStore((state) => state.plannedLinks);
    const plannedMarkers = useStore((state) => state.plannedMarkers);
    const mapState = useStore((state) => state.mapState);
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

    return (
        <div className="iris-planning-bar">
            <div className="iris-planning-main">
                <span className="iris-planning-kicker">Plan links</span>
                <span className="iris-planning-status">
                    {anchor ? `Anchor: ${anchor.name || 'Unknown portal'}` : 'Tap a portal to set anchor'}
                </span>
                <span className="iris-planning-count">
                    {plannedLinks.length} links · {plannedMarkers.length} markers
                </span>
            </div>
            <div className="iris-planning-actions">
                <button
                    className="iris-planning-btn"
                    onClick={() => addPlannedMarker(mapState.lat, mapState.lng)}
                    disabled={mapState.lat === 0 && mapState.lng === 0}
                >
                    Mark
                </button>
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
