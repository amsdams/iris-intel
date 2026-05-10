import { h, JSX } from 'preact';
import { useStore } from '@iris/core';

export function PlanningBar(): JSX.Element | null {
    const planningMode = useStore((state) => state.planningMode);
    const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
    const plannedLinks = useStore((state) => state.plannedLinks);
    const portals = useStore((state) => state.portals);
    const setPlanningMode = useStore((state) => state.setPlanningMode);
    const undoPlannedLink = useStore((state) => state.undoPlannedLink);
    const clearPlannedLinks = useStore((state) => state.clearPlannedLinks);

    if (!planningMode) {
        return null;
    }

    const anchor = planningAnchorPortalId ? portals[planningAnchorPortalId] : null;

    return (
        <div className="iris-planning-bar">
            <div className="iris-planning-main">
                <span className="iris-planning-kicker">Plan links</span>
                <span className="iris-planning-status">
                    {anchor ? `Anchor: ${anchor.name || 'Unknown portal'}` : 'Tap a portal to set anchor'}
                </span>
                <span className="iris-planning-count">{plannedLinks.length} planned</span>
            </div>
            <div className="iris-planning-actions">
                <button
                    className="iris-planning-btn"
                    onClick={undoPlannedLink}
                    disabled={plannedLinks.length === 0}
                >
                    Undo
                </button>
                <button
                    className="iris-planning-btn"
                    onClick={clearPlannedLinks}
                    disabled={plannedLinks.length === 0 && !planningAnchorPortalId}
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
