import {h, JSX, Fragment} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {EntityLogic, PlannedLink, PlannedMarker, useStore} from '@iris/core';
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
    const [backupOpen, setBackupOpen] = useState(false);
    const [backupText, setBackupText] = useState('');
    const [backupStatus, setBackupStatus] = useState<string | null>(null);
    const mapState = useStore((state) => state.mapState);
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);
    const plannedShowLinks = useStore((state) => state.plannedShowLinks);
    const plannedShowMarkers = useStore((state) => state.plannedShowMarkers);
    const plannedLinks = useStore((state) => state.plannedLinks);
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

    const buildBackupText = (): string => JSON.stringify({
        type: 'iris-draw-tools',
        version: 1,
        exportedAt: new Date().toISOString(),
        plannedLinks,
        plannedMarkers,
    }, null, 2);

    const exportPlannedData = (): void => {
        const text = buildBackupText();
        setBackupText(text);
        setBackupOpen(true);
        setBackupStatus(`Exported ${plannedLinks.length} links and ${plannedMarkers.length} markers`);
        navigator.clipboard?.writeText(text).catch(() => undefined);
    };

    const normalizeImportedLink = (value: unknown): PlannedLink | null => {
        if (!value || typeof value !== 'object') return null;
        const candidate = value as Partial<PlannedLink>;
        if (typeof candidate.fromPortalId !== 'string' || typeof candidate.toPortalId !== 'string') return null;
        if (!candidate.fromPortalId || !candidate.toPortalId || candidate.fromPortalId === candidate.toPortalId) return null;
        const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt) ? candidate.createdAt : Date.now();
        return {
            id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `planned-link:${candidate.fromPortalId}:${candidate.toPortalId}:${createdAt}`,
            fromPortalId: candidate.fromPortalId,
            toPortalId: candidate.toPortalId,
            createdAt,
        };
    };

    const normalizeImportedMarker = (value: unknown): PlannedMarker | null => {
        if (!value || typeof value !== 'object') return null;
        const candidate = value as Partial<PlannedMarker>;
        if (typeof candidate.lat !== 'number' || typeof candidate.lng !== 'number') return null;
        if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) return null;
        const color = candidate.color === 'white' || candidate.color === 'red' || candidate.color === 'blue' || candidate.color === 'green'
            ? candidate.color
            : 'blue';
        const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt) ? candidate.createdAt : Date.now();
        return {
            id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `planned-marker:${createdAt}`,
            lat: Math.round(candidate.lat * 1e6) / 1e6,
            lng: Math.round(candidate.lng * 1e6) / 1e6,
            label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : 'Imported marker',
            color,
            portalId: typeof candidate.portalId === 'string' && candidate.portalId ? candidate.portalId : undefined,
            createdAt,
        };
    };

    const extractPlannedData = (rawText: string): {plannedLinks: PlannedLink[]; plannedMarkers: PlannedMarker[]} => {
        const parsed = JSON.parse(rawText) as unknown;
        const source = parsed && typeof parsed === 'object' && 'state' in parsed && (parsed as {state?: unknown}).state
            ? (parsed as {state: unknown}).state
            : parsed;

        if (!source || typeof source !== 'object') {
            throw new Error('Backup must be a JSON object');
        }

        const rawLinks = (source as {plannedLinks?: unknown}).plannedLinks;
        const rawMarkers = (source as {plannedMarkers?: unknown}).plannedMarkers;
        const importedLinks = Array.isArray(rawLinks) ? rawLinks.map(normalizeImportedLink).filter((link): link is PlannedLink => link !== null) : [];
        const importedMarkers = Array.isArray(rawMarkers) ? rawMarkers.map(normalizeImportedMarker).filter((marker): marker is PlannedMarker => marker !== null) : [];

        if (importedLinks.length === 0 && importedMarkers.length === 0) {
            throw new Error('No planned links or markers found');
        }

        return {plannedLinks: importedLinks, plannedMarkers: importedMarkers};
    };

    const importPlannedData = (mode: 'merge' | 'replace'): void => {
        try {
            const imported = extractPlannedData(backupText);
            useStore.setState((state) => {
                const linkKey = (link: PlannedLink): string => [link.fromPortalId, link.toPortalId].sort().join(':');
                const markerKey = (marker: PlannedMarker): string => marker.portalId || `${Math.round(marker.lat * 1e6)}:${Math.round(marker.lng * 1e6)}`;
                const nextLinks = mode === 'replace' ? [] : [...state.plannedLinks];
                const nextMarkers = mode === 'replace' ? [] : [...state.plannedMarkers];
                const linkKeys = new Set(nextLinks.map(linkKey));
                const markerKeys = new Set(nextMarkers.map(markerKey));

                for (const link of imported.plannedLinks) {
                    const key = linkKey(link);
                    if (linkKeys.has(key)) continue;
                    linkKeys.add(key);
                    nextLinks.push(link);
                }

                for (const marker of imported.plannedMarkers) {
                    const key = markerKey(marker);
                    if (markerKeys.has(key)) continue;
                    markerKeys.add(key);
                    nextMarkers.push(marker);
                }

                return {
                    pluginStates: {...state.pluginStates, 'planned-links': true},
                    plannedLinks: nextLinks,
                    plannedMarkers: nextMarkers,
                    plannedShowLinks: true,
                    plannedShowMarkers: true,
                    selectedPlannedItemId: null,
                    selectedPlannedItemType: null,
                };
            });
            setBackupStatus(`${mode === 'replace' ? 'Replaced with' : 'Merged'} ${imported.plannedLinks.length} links and ${imported.plannedMarkers.length} markers`);
        } catch (error) {
            setBackupStatus(error instanceof Error ? error.message : 'Import failed');
        }
    };

    return (
        <Fragment>
            <DrawerSection label="Map Navigation">
                <DrawerButton icon="🔍" label="Search" onClick={() => onAction('search')} />
                <DrawerButton icon="🧭" label="Controls" onClick={() => onAction('nav')} />
                <DrawerButton icon="⚙️" label="Settings" onClick={() => onAction('settings')} />
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
            <div>
                <div className="iris-drawer-section-label">Draw Tools Backup</div>
                <div className="iris-drawer-backup-actions iris-ui-list-actions">
                    <button type="button" className="iris-ui-list-action iris-ui-list-action-primary" onClick={exportPlannedData}>
                        Export
                    </button>
                    <button type="button" className="iris-ui-list-action" onClick={() => {
                        setBackupOpen((open) => !open);
                        setBackupStatus(null);
                    }}>
                        Import
                    </button>
                </div>
                {backupOpen && (
                    <div className="iris-drawer-backup-panel">
                        <textarea
                            className="iris-drawer-backup-textarea"
                            value={backupText}
                            placeholder="Paste an iris-draw-tools backup or full iris-settings JSON here."
                            onInput={(event) => setBackupText((event.target as HTMLTextAreaElement).value)}
                        />
                        <div className="iris-drawer-backup-actions iris-ui-list-actions">
                            <button type="button" className="iris-ui-list-action iris-ui-list-action-primary" onClick={() => importPlannedData('merge')}>
                                Merge
                            </button>
                            <button type="button" className="iris-ui-list-action iris-ui-list-action-danger" onClick={() => importPlannedData('replace')}>
                                Replace
                            </button>
                        </div>
                    </div>
                )}
                {backupStatus && (
                    <div className="iris-drawer-backup-status">
                        {backupStatus}
                    </div>
                )}
            </div>
            {plannedLinksEnabled && (
                <div>
                    <div className="iris-drawer-section-label">Markers by Distance</div>
                    {markerRows.length === 0 ? (
                        <div className="iris-drawer-empty-note">
                            No planned markers.
                        </div>
                    ) : (
                        <div className="iris-drawer-marker-list iris-ui-list">
                            {markerRows.map(({marker, distanceKm}) => {
                                const isEditing = editingMarkerId === marker.id;
                                const isSelected = selectedPlannedItemId === marker.id;
                                return (
                                    <div
                                        key={marker.id}
                                        ref={isSelected ? selectedMarkerRowRef : undefined}
                                        className={`iris-drawer-marker-row iris-ui-list-row iris-drawer-marker-row-${marker.color} ${isSelected ? 'iris-drawer-marker-row-active iris-ui-list-row-active' : ''}`}
                                        onClick={isEditing ? undefined : (event): void => navigateToMarkerFromRow(marker, event)}
                                    >
                                        {isEditing ? (
                                            <div className="iris-drawer-marker-target">
                                                <span className="iris-drawer-marker-swatch" />
                                                <span className="iris-drawer-marker-main iris-ui-list-main">
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
                                                    <span className="iris-drawer-marker-coords iris-ui-list-meta">
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
                                                <span className="iris-drawer-marker-main iris-ui-list-main">
                                                    <span className="iris-drawer-marker-label iris-ui-list-title">{marker.label}</span>
                                                    <span className="iris-drawer-marker-coords iris-ui-list-meta">
                                                        {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                                    </span>
                                                </span>
                                                <span className="iris-drawer-marker-distance">
                                                    {formatDistance(distanceKm)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="iris-drawer-marker-actions iris-ui-list-actions">
                                            {isEditing ? (
                                                <Fragment>
                                                    <button type="button" className="iris-drawer-marker-action iris-ui-list-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        saveMarkerLabel();
                                                    }}>Save</button>
                                                    <button type="button" className="iris-drawer-marker-action iris-ui-list-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        cancelMarkerLabelEdit();
                                                    }}>Cancel</button>
                                                </Fragment>
                                            ) : (
                                                <Fragment>
                                                    <button type="button" className="iris-drawer-marker-action iris-ui-list-action" onClick={(event) => {
                                                        event.stopPropagation();
                                                        startEditingMarker(marker);
                                                    }}>Edit</button>
                                                    <button
                                                        type="button"
                                                        className={`iris-drawer-marker-action iris-ui-list-action ${confirmDeleteMarkerId === marker.id ? 'iris-drawer-marker-action-danger iris-ui-list-action-danger' : ''}`}
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
