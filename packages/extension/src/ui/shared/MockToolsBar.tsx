import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { useRenderDiagnostics } from './useRenderDiagnostics';

interface MockToolAction {
    label: string;
    loadTitle: string;
    clearTitle: string;
    loadType: string;
    clearType: string;
    active: boolean;
}

const MOCK_INVENTORY_GUID_PATTERN = /^(xmp|reso|ultra|pc|shield|heat-sink|transmuter|key|ada|jarvis|fracker|battle-beacon|apex|hypercube|drone|entitlement|capsule)-/;
const MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX = 'mock-player-activity:';

export function MockToolsBar(): JSX.Element | null {
    useRenderDiagnostics('MockToolsBar');

    const showMockTools = useStore((state) => state.showMockTools);
    const hasMockArtifacts = useStore((state) => Object.keys(state.artifacts).length > 0);
    const hasMockOrnaments = useStore((state) => Object.keys(state.mockOrnaments).length > 0);
    const hasMockInventory = useStore((state) => state.inventory.some((item) => MOCK_INVENTORY_GUID_PATTERN.test(item.guid)));
    const hasMockPortalKeys = useStore((state) => state.inventory.some((item) => item.guid.startsWith('mock-loaded-')));
    const hasMockPasscode = useStore((state) => state.passcodeRewards !== null);
    const hasMockPlayerTracker = useStore((state) =>
        state.pluginFeatures.features.some((feature) => String(feature.properties?.id ?? '').startsWith('mock-player:'))
    );
    const hasMockPlayerActivity = useStore((state) =>
        state.plexts.some((plext) => plext.id.startsWith(MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX))
    );

    if (!showMockTools) {
        return null;
    }

    const actions: MockToolAction[] = [
        {
            label: 'Artifacts',
            loadTitle: 'Load mock artifacts',
            clearTitle: 'Clear mock artifacts',
            loadType: 'IRIS_LOAD_MOCK_ARTIFACTS',
            clearType: 'IRIS_CLEAR_MOCK_ARTIFACTS',
            active: hasMockArtifacts,
        },
        {
            label: 'Ornaments',
            loadTitle: 'Load mock ornaments',
            clearTitle: 'Clear mock ornaments',
            loadType: 'IRIS_LOAD_MOCK_ORNAMENTS',
            clearType: 'IRIS_CLEAR_MOCK_ORNAMENTS',
            active: hasMockOrnaments,
        },
        {
            label: 'Inventory',
            loadTitle: 'Load mock inventory',
            clearTitle: 'Clear mock inventory',
            loadType: 'IRIS_LOAD_MOCK_INVENTORY',
            clearType: 'IRIS_CLEAR_MOCK_INVENTORY',
            active: hasMockInventory,
        },
        {
            label: '500 Keys',
            loadTitle: 'Load 500 mock keys on loaded portals',
            clearTitle: 'Clear mock key inventory',
            loadType: 'IRIS_LOAD_MOCK_PORTAL_KEYS_500',
            clearType: 'IRIS_CLEAR_MOCK_INVENTORY',
            active: hasMockPortalKeys,
        },
        {
            label: 'Passcode',
            loadTitle: 'Load mock passcode rewards',
            clearTitle: 'Clear mock passcode rewards',
            loadType: 'IRIS_LOAD_MOCK_PASSCODE',
            clearType: 'IRIS_CLEAR_MOCK_PASSCODE',
            active: hasMockPasscode,
        },
        {
            label: '8 Players',
            loadTitle: 'Load 8 mock players on one portal',
            clearTitle: 'Clear mock player tracker pins',
            loadType: 'IRIS_LOAD_MOCK_PLAYER_TRACKER',
            clearType: 'IRIS_CLEAR_MOCK_PLAYER_TRACKER',
            active: hasMockPlayerTracker,
        },
        {
            label: 'Activity',
            loadTitle: 'Load 10 mock player activity plexts across nearby portals',
            clearTitle: 'Clear mock player activity plexts',
            loadType: 'IRIS_LOAD_MOCK_PLAYER_ACTIVITY',
            clearType: 'IRIS_CLEAR_MOCK_PLAYER_ACTIVITY',
            active: hasMockPlayerActivity,
        },
    ];

    return (
        <div className="iris-mock-tools-bar iris-ui-floating-panel iris-ui-scroll-row" aria-label="Mock data tools">
            <span className="iris-mock-tools-label">Mock</span>
            {actions.map((action) => (
                <button
                    key={action.loadType}
                    className={`iris-mock-tools-btn iris-ui-compact-pill ${action.active ? 'iris-ui-compact-pill-active iris-mock-tools-btn-active' : ''}`}
                    title={action.active ? action.clearTitle : action.loadTitle}
                    onClick={() => window.postMessage({ type: action.active ? action.clearType : action.loadType }, '*')}
                    aria-pressed={action.active}
                >
                    {action.label}
                </button>
            ))}
            <button
                className="iris-mock-tools-btn iris-ui-compact-pill"
                title="Run a 5 second automated pan benchmark"
                onClick={() => window.postMessage({ type: 'IRIS_RUN_PAN_BENCHMARK' }, '*')}
            >
                Bench
            </button>
        </div>
    );
}
