export * from './store';
export * from './PluginManager';
export * from './SpatialIndex';
export * from './logic/EntityLogic';
export * from './geometry/wrapped-lines';
export * from './geo-bounds';
export * from './requests/entities';
export * from './requests/extension-messages';
export * from './requests/plext';
export * from './player-tracker';
export * from './portal-details';
export * from './portal-history';
export * from './safe-storage';
export * from './plext-refresh-hints';
export * from './map-features';
export * from './map-camera';
export * from './entity-display';
export * from './ingress-map-style';
export * from './benchmark-frames';
export * from './endpoint-formatting';
export * from './endpoint-request-policy';
export * from './keyed-refresh';
export * from './live-update-policy';
export * from './plext-debug';
export * from './portal-display';
export * from './diagnostics-formatting';
export * from './persistence-schema';
export * from './ZoomPolicy';
export * from './parsers/EntityParser';
export * from './parsers/PortalDetailsParser';
export * from './parsers/ArtifactParser';
export * from './parsers/GameScoreParser';
export * from './parsers/InventoryParser';
export * from './parsers/MissionParser';
export * from './parsers/PlextParser';
export * from './parsers/RegionScoreParser';
export * from './parsers/PasscodeParser';
export * from './parsers/PlayerParser';
export * from './parsers/intel-types';

/**
 * Normalizes various team strings from Intel API into standard IRIS keys:
 * E: Enlightened
 * R: Resistance
 * M: Neutral, M(Machina)
 * N: Uncaptured, N
 */
export const normalizeTeam = (team: string | undefined): string => {
    let result = 'N';
    if (team) {
        const t = team.toUpperCase();
        if (t === 'ENLIGHTENED' || t === 'E') result = 'E';
        else if (t === 'RESISTANCE' || t === 'R') result = 'R';
        else if (t === 'MACHINA' || t === 'M' || t === 'ALIENS') result = 'M';
        else if (t === 'NEUTRAL' || t === 'N') result = 'N';
    }
    return result;
};
