import { h, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { UI_COLORS } from '../../theme';

export function SessionAlert(): JSX.Element | null {
    const sessionStatus = useStore((state) => state.sessionStatus);
    const lastSessionError = useStore((state) => state.lastSessionError);
    const [dismissedErrorTime, setDismissedErrorTime] = useState<number | null>(null);

    useEffect(() => {
        if (sessionStatus !== 'expired' && sessionStatus !== 'initial_login_required') {
            setDismissedErrorTime(null);
        }
    }, [sessionStatus]);

    if ((sessionStatus !== 'expired' && sessionStatus !== 'initial_login_required') || !lastSessionError) {
        return null;
    }

    if (dismissedErrorTime === lastSessionError.time) {
        return null;
    }

    const openIntelLogin = (): void => {
        window.location.assign(
            'https://signin.nianticspatial.com/signin?continue=https%3A%2F%2Fintel.ingress.com%2Fsigninhandler%3Fiitc%3D&service=ingress-intel',
        );
    };

    const isInitialLogin = sessionStatus === 'initial_login_required';

    return (
        <div className="iris-session-alert" role="alert" aria-live="assertive">
            <div className="iris-session-alert-copy">
                <div className="iris-session-alert-title">{isInitialLogin ? 'Sign In Required' : 'Session Expired'}</div>
                <div className="iris-session-alert-text">
                    {isInitialLogin
                        ? 'Intel sign-in is required before IRIS can load the dashboard. Sign in on Intel to continue.'
                        : 'Intel sign-in is required before IRIS can continue. Open Intel, sign in, then reload if needed.'}
                </div>
                <div className="iris-session-alert-meta" style={{ color: UI_COLORS.TEXT_MUTED }}>
                    {lastSessionError.statusText} ({lastSessionError.status}) - {lastSessionError.url}
                </div>
            </div>
            <div className="iris-session-alert-actions">
                <button
                    type="button"
                    className="iris-session-alert-button iris-session-alert-button-primary"
                    onClick={openIntelLogin}
                >
                    Sign In On Intel
                </button>
                {!isInitialLogin && (
                    <button
                        type="button"
                        className="iris-session-alert-button"
                        onClick={() => window.location.reload()}
                    >
                        Reload After Login
                    </button>
                )}
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
