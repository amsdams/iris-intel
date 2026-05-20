import {h, JSX, Fragment} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {EntityLogic, useStore} from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

interface MapTabProps {
    onAction: (action: string) => void;
}

export function MapTab({ onAction }: MapTabProps): JSX.Element {
    const selectedMarkerRowRef = useRef<HTMLDivElement | null>(null);
    const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [confirmDeleteMarkerId, setConfirmDeleteMarkerId] = useState<string | null>(null);
    const [pendingScrollMarkerId, setPendingScrollMarkerId] = useState<string | null>(null);
    const mapState = useStore((state) => state.mapState);
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);
    const plannedShowLinks = useStore((state) => state.plannedShowLinks);
    const plannedShowMarkers = useStore((state) => state.plannedShowMarkers);
    const plannedMarkers = useStore((state) => state.plannedMarkers);
    const selectedPlannedItemId = useStore((state) => state.selectedPlannedItemId);
    const togglePlannedShowLinks = useStore((state) => state.togglePlannedShowLinks);
    const togglePlannedShowMarkers = useStore((state) => state.togglePlannedShowMarkers);
    const selectPlannedMarker = useStore((state) => state.selectPlannedMarker);
    const renamePlannedMarker = useStore((state) => state.renamePlannedMarker);
    const deletePlannedMarker = useStore((state) => state.deletePlannedMarker);

    const markerRows = plannedMarkers
        .map((marker) => ({
            marker,
            distanceKm: EntityLogic.getDistKm(mapState.lat, mapState.lng, marker.lat, marker.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

    const formatDistance = (distanceKm: number): string => {
        if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
        if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
        return `${Math.round(distanceKm)}km`;
    };

    useEffect(() => {
        if (!pendingScrollMarkerId || selectedPlannedItemId !== pendingScrollMarkerId) return;
        const selectedMarker = plannedMarkers.find((marker) => marker.id === pendingScrollMarkerId);
        if (!selectedMarker) {
            setPendingScrollMarkerId(null);
            return;
        }

        const distanceFromMapCenter = EntityLogic.getDistKm(
            mapState.lat,
            mapState.lng,
            selectedMarker.lat,
            selectedMarker.lng,
        );
        if (distanceFromMapCenter > 0.05) return;

        window.requestAnimationFrame(() => {
            selectedMarkerRowRef.current?.scrollIntoView({block: 'nearest'});
            setPendingScrollMarkerId(null);
        });
    }, [mapState.lat, mapState.lng, pendingScrollMarkerId, plannedMarkers, selectedPlannedItemId]);

    const navigateToMarker = (marker: {id: string; lat: number; lng: number}, target: EventTarget | null): void => {
        if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
        selectPlannedMarker(marker.id);
        setPendingScrollMarkerId(marker.id);
        setConfirmDeleteMarkerId(null);
        if (target instanceof HTMLElement) {
            target.blur();
        }
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: {lat: marker.lat, lng: marker.lng},
            zoom: Math.max(mapState.zoom, 16),
        }, '*');
        onAction('marker-map-focus');
    };

    const navigateToMarkerFromRow = (marker: {id: string; lat: number; lng: number}, event: JSX.TargetedMouseEvent<HTMLDivElement>): void => {
        const target = event.target;
        if (
            target instanceof HTMLElement &&
            target.closest('.iris-drawer-marker-action, .iris-drawer-marker-input')
        ) {
            return;
        }
        navigateToMarker(marker, event.currentTarget);
    };

    const startEditingMarker = (marker: {id: string; label: string}): void => {
        setEditingMarkerId(marker.id);
        setEditingLabel(marker.label);
        setConfirmDeleteMarkerId(null);
    };

    const saveMarkerLabel = (): void => {
        if (!editingMarkerId) return;
        renamePlannedMarker(editingMarkerId, editingLabel);
        setEditingMarkerId(null);
        setEditingLabel('');
    };

    const cancelMarkerLabelEdit = (): void => {
        setEditingMarkerId(null);
        setEditingLabel('');
    };

    const deleteMarker = (id: string): void => {
        if (confirmDeleteMarkerId !== id) {
            selectPlannedMarker(id);
            setConfirmDeleteMarkerId(id);
            setEditingMarkerId(null);
            return;
        }

        deletePlannedMarker(id);
        setConfirmDeleteMarkerId(null);
    };

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
            {plannedLinksEnabled && (
                <div>
                    <div className="iris-drawer-section-label">Markers by Distance</div>
                    {markerRows.length === 0 ? (
                        <div className="iris-drawer-empty-note">
                            No planned markers.
                        </div>
                    ) : (
                        <div className="iris-drawer-marker-list">
                            {markerRows.map(({marker, distanceKm}) => {
                                const isEditing = editingMarkerId === marker.id;
                                const isSelected = selectedPlannedItemId === marker.id;
                                return (
                                    <div
                                        key={marker.id}
                                        ref={isSelected ? selectedMarkerRowRef : undefined}
                                        className={`iris-drawer-marker-row iris-drawer-marker-row-${marker.color} ${isSelected ? 'iris-drawer-marker-row-active' : ''}`}
                                        onClick={isEditing ? undefined : (event): void => navigateToMarkerFromRow(marker, event)}
                                    >
                                        {isEditing ? (
                                            <div className="iris-drawer-marker-target">
                                                <span className="iris-drawer-marker-swatch" />
                                                <span className="iris-drawer-marker-main">
                                                    <input
                                                        className="iris-drawer-marker-input"
                                                        value={editingLabel}
                                                        autoFocus
                                                        onInput={(event) => setEditingLabel((event.target as HTMLInputElement).value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') saveMarkerLabel();
                                                            if (event.key === 'Escape') cancelMarkerLabelEdit();
                                                        }}
                                                    />
                                                    <span className="iris-drawer-marker-coords">
                                                        {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                                    </span>
                                                </span>
                                                <span className="iris-drawer-marker-distance">
                                                    {formatDistance(distanceKm)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div
                                                className="iris-drawer-marker-target"
                                            >
                                                <span className="iris-drawer-marker-swatch" />
                                                <span className="iris-drawer-marker-main">
                                                    <span className="iris-drawer-marker-label">{marker.label}</span>
                                                    <span className="iris-drawer-marker-coords">
                                                        {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                                    </span>
                                                </span>
                                                <span className="iris-drawer-marker-distance">
                                                    {formatDistance(distanceKm)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="iris-drawer-marker-actions">
                                            {isEditing ? (
                                                <Fragment>
                                                    <button type="button" className="iris-drawer-marker-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        saveMarkerLabel();
                                                    }}>Save</button>
                                                    <button type="button" className="iris-drawer-marker-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        cancelMarkerLabelEdit();
                                                    }}>Cancel</button>
                                                </Fragment>
                                            ) : (
                                                <Fragment>
                                                    <button type="button" className="iris-drawer-marker-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        startEditingMarker(marker);
                                                    }}>Edit</button>
                                                    <button
                                                        type="button"
                                                        className={`iris-drawer-marker-action ${confirmDeleteMarkerId === marker.id ? 'iris-drawer-marker-action-danger' : ''}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            deleteMarker(marker.id);
                                                        }}
                                                    >
                                                        {confirmDeleteMarkerId === marker.id ? 'Confirm' : 'Delete'}
                                                    </button>
                                                </Fragment>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Fragment>
    );
}
