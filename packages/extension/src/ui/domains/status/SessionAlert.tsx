import { h, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { UI_COLORS } from '../../theme';

export function SessionAlert(): JSX.Element | null {
    const sessionStatus = useStore((state) => state.sessionStatus);
    const lastSessionError = useStore((state) => state.lastSessionError);
    const [dismissedErrorTime, setDismissedErrorTime] = useState<number | null>(null);

    useEffect(() => {
        if (sessionStatus !== 'expired') {
            setDismissedErrorTime(null);
        }
    }, [sessionStatus]);

    if (sessionStatus !== 'expired' || !lastSessionError) {
        return null;
    }

    if (dismissedErrorTime === lastSessionError.time) {
        return null;
    }

    return (
        <div className="iris-session-alert" role="alert" aria-live="assertive">
            <div className="iris-session-alert-copy">
                <div className="iris-session-alert-title">Session Expired</div>
                <div className="iris-session-alert-text">
                    Intel sign-in is required. Sign in on intel.ingress.com, then reload.
                </div>
                <div className="iris-session-alert-meta" style={{ color: UI_COLORS.TEXT_MUTED }}>
                    {lastSessionError.statusText} ({lastSessionError.status}) - {lastSessionError.url}
                </div>
            </div>
            <div className="iris-session-alert-actions">
                <button
                    type="button"
                    className="iris-session-alert-button iris-session-alert-button-primary"
                    onClick={() => window.location.reload()}
                >
                    Reload Intel
                </button>
                <button
                    type="button"
                    className="iris-session-alert-button"
                    onClick={() => setDismissedErrorTime(lastSessionError.time)}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
