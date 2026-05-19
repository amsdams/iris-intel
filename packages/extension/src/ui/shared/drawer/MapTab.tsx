import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

interface MapTabProps {
    onAction: (action: string) => void;
}

export function MapTab({ onAction }: MapTabProps): JSX.Element {
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);
    const plannedShowLinks = useStore((state) => state.plannedShowLinks);
    const plannedShowMarkers = useStore((state) => state.plannedShowMarkers);
    const togglePlannedShowLinks = useStore((state) => state.togglePlannedShowLinks);
    const togglePlannedShowMarkers = useStore((state) => state.togglePlannedShowMarkers);

    return (
        <Fragment>
            <DrawerSection label="Map Navigation">
                <DrawerButton icon="🔍" label="Search" onClick={() => onAction('search')} />
                <DrawerButton icon="🧭" label="Controls" onClick={() => onAction('nav')} />
                <DrawerButton icon="🚀" label="Missions" onClick={() => onAction('missions')} />
                {plannedLinksEnabled && (
                    <Fragment>
                        <DrawerButton active={plannedShowLinks} icon="〰" label="Vis Links" onClick={togglePlannedShowLinks} />
                        <DrawerButton active={plannedShowMarkers} icon="◉" label="Vis Marks" onClick={togglePlannedShowMarkers} />
                        <DrawerButton active={planningMode && planningTool === 'links'} icon="↔" label="Links" onClick={() => onAction('planning-links')} />
                        <DrawerButton active={planningMode && planningTool === 'markers'} icon="●" label="Markers" onClick={() => onAction('planning-markers')} />
                    </Fragment>
                )}
            </DrawerSection>
        </Fragment>
    );
}
