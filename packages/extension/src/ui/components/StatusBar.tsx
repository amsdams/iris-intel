import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { UI_COLORS, SPACING } from '../theme';

export function StatusBar() {
    const activeRequests = useStore((state) => state.activeRequests);
    const lastRequestUrl = useStore((state) => state.lastRequestUrl);
    const failedRequests = useStore((state) => state.failedRequests);
    const clearFailedRequests = useStore((state) => state.clearFailedRequests);
    
    const [isExpanded, setIsExpanded] = useState(false);

    // Extract endpoint name from URL for cleaner display
    const getEndpointName = (url: string) => {
        if (url.includes('getEntities')) return 'getEntities';
        if (url.includes('getPortalDetails')) return 'getPortalDetails';
        if (url.includes('getPlexts')) return 'getPlexts';
        return url.split('/').pop() || 'Request';
    };

    const toggleExpanded = (e: MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClear = (e: MouseEvent) => {
        e.stopPropagation();
        clearFailedRequests();
        setIsExpanded(false);
    };

    return (
        <div 
            onClick={toggleExpanded}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                borderTop: `1px solid ${UI_COLORS.BORDER_DIM}`,
                display: 'flex',
                flexDirection: 'column',
                fontSize: '10px',
                color: UI_COLORS.TEXT_MUTED,
                fontFamily: 'monospace',
                zIndex: 10001,
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition: 'max-height 0.3s ease-in-out',
                maxHeight: isExpanded ? '300px' : '24px',
            }}
        >
            {/* Expanded List */}
            {isExpanded && (
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: SPACING.SM,
                    borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`,
                    background: 'rgba(20, 0, 0, 0.4)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.SM, borderBottom: '1px solid #444', paddingBottom: '4px' }}>
                        <span style={{ color: '#ff5555', fontWeight: 'bold' }}>FAILED REQUESTS ({failedRequests.length})</span>
                        <span 
                            onClick={handleClear}
                            style={{ color: UI_COLORS.AQUA, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            CLEAR
                        </span>
                    </div>
                    {failedRequests.length === 0 ? (
                        <div style={{ padding: SPACING.MD, textAlign: 'center', color: '#666' }}>No failed requests</div>
                    ) : (
                        failedRequests.map((req, i) => (
                            <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                                <div style={{ color: '#ff5555', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>[{new Date(req.time).toLocaleTimeString()}] {getEndpointName(req.url)}</span>
                                    <span>STATUS: {req.status}</span>
                                </div>
                                <div style={{ color: '#888', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {req.statusText} — {req.url}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Main Bar */}
            <div style={{
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${SPACING.MD}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: activeRequests > 0 ? UI_COLORS.AQUA : (failedRequests.length > 0 ? '#ff0000' : '#333'),
                        marginRight: SPACING.SM,
                        boxShadow: activeRequests > 0 ? `0 0 5px ${UI_COLORS.AQUA}` : (failedRequests.length > 0 ? '0 0 5px #ff0000' : 'none'),
                        transition: 'background 0.3s ease, box-shadow 0.3s ease'
                    }} />
                    <span style={{ color: activeRequests > 0 ? UI_COLORS.TEXT_BASE : (failedRequests.length > 0 ? '#ff5555' : UI_COLORS.TEXT_MUTED) }}>
                        {activeRequests > 0 ? `NET: ${activeRequests} ACTIVE` : 'NET: IDLE'}
                        {failedRequests.length > 0 && ` (${failedRequests.length} FAILED)`}
                    </span>
                    {activeRequests > 0 && lastRequestUrl && (
                        <span style={{ marginLeft: SPACING.MD, opacity: 0.8 }}>
                            FETCHING {getEndpointName(lastRequestUrl)}...
                        </span>
                    )}
                </div>

                {/* Simple Progress Bar */}
                <div style={{ 
                    width: '100px', 
                    height: '2px', 
                    background: '#222', 
                    borderRadius: '1px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {activeRequests > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '50%',
                            background: UI_COLORS.AQUA,
                            boxShadow: `0 0 5px ${UI_COLORS.AQUA}`,
                            animation: 'iris-progress 1.5s infinite linear'
                        }} />
                    )}
                </div>
            </div>

            <style>{`
                @keyframes iris-progress {
                    0% { left: -50%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
}
