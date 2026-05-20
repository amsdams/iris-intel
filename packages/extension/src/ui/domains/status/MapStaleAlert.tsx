import { h, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@iris/core';

const CLOSE_VIEW_STALE_MS = 5 * 60 * 1000;
const FAR_VIEW_STALE_MS = 15 * 60 * 1000;
const CLOSE_VIEW_ZOOM_THRESHOLD = 12;

function formatAge(ageMs: number): string {
    const minutes = Math.max(1, Math.round(ageMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`;
}

export function MapStaleAlert(): JSX.Element | null {
    const entityDiagnostics = useStore((state) => state.endpointDiagnostics.entities);
    const mapState = useStore((state) => state.mapState);
    const sessionStatus = useStore((state) => state.sessionStatus);
    const [now, setNow] = useState(Date.now());
    const [online, setOnline] = useState(() => navigator.onLine);
    const [dismissedKey, setDismissedKey] = useState<string | null>(null);

    useEffect(() => {
        const updateNow = (): void => {
            setNow(Date.now());
            setOnline(navigator.onLine);
        };
        const interval = window.setInterval(updateNow, 60000);

        document.addEventListener('visibilitychange', updateNow);
        window.addEventListener('focus', updateNow);
        window.addEventListener('online', updateNow);

        return (): void => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', updateNow);
            window.removeEventListener('focus', updateNow);
            window.removeEventListener('online', updateNow);
        };
    }, []);

    if (sessionStatus !== 'ok' || !mapState.bounds || entityDiagnostics.status === 'in_flight') {
        return null;
    }

    const isOffline = !online;
    const staleAfterMs = mapState.zoom > CLOSE_VIEW_ZOOM_THRESHOLD ? CLOSE_VIEW_STALE_MS : FAR_VIEW_STALE_MS;
    const lastSuccessAt = entityDiagnostics.lastSuccessAt;
    const hasError = entityDiagnostics.status === 'error';
    const hasNoSuccessfulRefresh = lastSuccessAt === null;
    const ageMs = typeof lastSuccessAt === 'number' ? now - lastSuccessAt : 0;
    const isStale = typeof lastSuccessAt === 'number' && ageMs > staleAfterMs;

    if (!isOffline && !hasError && !hasNoSuccessfulRefresh && !isStale) {
        return null;
    }

    const reason = isOffline
        ? 'Browser is offline. IRIS will refresh the current view when the connection returns.'
        : hasError
        ? 'Entity refresh failed.'
        : hasNoSuccessfulRefresh
            ? 'Current map has not refreshed yet.'
            : `Last map refresh was ${formatAge(ageMs)}.`;
    const alertKey = `${isOffline ? 'offline' : 'online'}:${entityDiagnostics.status}:${lastSuccessAt ?? 'never'}:${entityDiagnostics.lastErrorAt ?? 'no-error'}:${Math.floor(mapState.zoom)}`;

    if (dismissedKey === alertKey) {
        return null;
    }

    const refreshMap = (): void => {
        if (isOffline) return;
        window.postMessage({ type: 'IRIS_REFRESH_CURRENT_VIEW', reason: 'manual' }, '*');
        setDismissedKey(alertKey);
    };

    return (
        <div className="iris-map-stale-alert" role="status" aria-live="polite">
            <div className="iris-session-alert-copy">
                <div className="iris-map-stale-alert-title">{isOffline ? 'Map Offline' : 'Map May Be Stale'}</div>
                <div className="iris-session-alert-text">
                    {isOffline ? reason : `${reason} Refresh the current view if portals, links, or fields look out of date.`}
                </div>
            </div>
            <div className="iris-session-alert-actions">
                {!isOffline && (
                    <button
                        type="button"
                        className="iris-popup-action-button"
                        onClick={refreshMap}
                    >
                        Refresh
                    </button>
                )}
                <button
                    type="button"
                    className="iris-popup-action-button"
                    onClick={() => setDismissedKey(alertKey)}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
