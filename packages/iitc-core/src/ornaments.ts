export interface IitcOrnamentDefinition {
  layer?: string;
  url?: string;
  offset?: [number, number];
  opacity?: number;
}

export interface IitcOrnamentVisibilitySettings {
  excludedPatterns: string[];
  hiddenKnown: Record<string, boolean>;
  layerStatus: Record<string, boolean>;
}

export const IITC_ORNAMENT_DEFINITIONS: Record<string, IitcOrnamentDefinition> = {
  bb_s: {layer: 'Battle'},
  sc4_p: {layer: 'Scouting'},
  sc5_p: {layer: 'Scouting'},
  ap1: {layer: 'Anomaly'},
  ap1_v: {layer: 'Anomaly'},
  ap2: {layer: 'Anomaly'},
  ap2_v: {layer: 'Anomaly'},
  ap3: {layer: 'Anomaly'},
  ap3_v: {layer: 'Anomaly'},
  ap5: {layer: 'Anomaly'},
  ap5_v: {layer: 'Anomaly'},
  peBB_BATTLE: {layer: 'Battle'},
  peBB_BATTLE_RARE: {layer: 'Battle'},
  peBN_BLM: {layer: 'Beacons'},
  peBN_ENL_WINNER: {layer: 'Battle'},
  'peBN_ENL_WINNER-60': {layer: 'Battle'},
  peBN_MHN_LOGO: {layer: 'Beacons'},
  peBN_MHN_PALICO: {layer: 'Beacons'},
  peBN_PEACE: {layer: 'Beacons'},
  peBN_RES_WINNER: {layer: 'Battle'},
  'peBN_RES_WINNER-60': {layer: 'Battle'},
  peBN_TIED_WINNER: {layer: 'Battle'},
  'peBN_TIED_WINNER-60': {layer: 'Battle'},
  'peBR_REWARD-10_125_38': {layer: 'Battle'},
  'peBR_REWARD-10_150_75': {layer: 'Battle'},
  'peBR_REWARD-10_175_113': {layer: 'Battle'},
  'peBR_REWARD-10_200_150': {layer: 'Battle'},
  'peBR_REWARD-10_225_188': {layer: 'Battle'},
  'peBR_REWARD-10_250_225': {layer: 'Battle'},
  peENL: {layer: 'Beacons'},
  peFRACK: {layer: 'Fracker'},
  peFW_ENL: {layer: 'Beacons'},
  peFW_RES: {layer: 'Beacons'},
  peLOOK: {layer: 'Shards'},
  peMAGNUSRE: {layer: 'Beacons'},
  peMEET: {layer: 'Beacons'},
  peNIA: {layer: 'Beacons'},
  peRES: {layer: 'Beacons'},
  peTOASTY: {layer: 'Beacons'},
  peVIALUX: {layer: 'Beacons'},
};

export function getIitcOrnamentDefinition(ornament: string): IitcOrnamentDefinition | undefined {
  const exactDefinition = IITC_ORNAMENT_DEFINITIONS[ornament];
  if (exactDefinition) return exactDefinition;

  if (/^ap\d+(?:_(?:v|start|end))?$/.test(ornament)) return {layer: 'Anomaly'};
  if (/^sc\d+_p$/.test(ornament)) return {layer: 'Scouting'};
  if (ornament === 'bb_s' || ornament.startsWith('peBB_') || ornament.startsWith('peBR_')) return {layer: 'Battle'};
  if (/^peBN_(?:ENL|RES|TIED)_WINNER(?:-\d+)?$/.test(ornament)) return {layer: 'Battle'};
  if (ornament === 'peFRACK') return {layer: 'Fracker'};
  if (ornament === 'peLOOK') return {layer: 'Shards'};
  if (ornament.startsWith('pe')) return {layer: 'Beacons'};

  return undefined;
}

export function isIitcExcludedOrnament(ornament: string, settings: IitcOrnamentVisibilitySettings): boolean {
  const layerName = getIitcOrnamentDefinition(ornament)?.layer;
  return settings.excludedPatterns.some((pattern) => ornament.startsWith(pattern)) ||
    settings.hiddenKnown[ornament] === true ||
    (layerName !== undefined && settings.layerStatus[layerName] === false);
}

export function parseIitcOrnamentVisibilitySettings(values: {
  excludedOrnaments?: unknown;
  knownOrnaments?: unknown;
  layerGroupDisplayed?: unknown;
}): IitcOrnamentVisibilitySettings {
  const excludedPatterns = Array.isArray(values.excludedOrnaments)
    ? values.excludedOrnaments.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const hiddenKnown = values.knownOrnaments && typeof values.knownOrnaments === 'object' && !Array.isArray(values.knownOrnaments)
    ? Object.fromEntries(
      Object.entries(values.knownOrnaments).filter((entry): entry is [string, boolean] =>
        typeof entry[0] === 'string' && typeof entry[1] === 'boolean'),
    )
    : {};
  const layerStatus = values.layerGroupDisplayed && typeof values.layerGroupDisplayed === 'object' && !Array.isArray(values.layerGroupDisplayed)
    ? Object.fromEntries(
      Object.entries(values.layerGroupDisplayed).filter((entry): entry is [string, boolean] =>
        typeof entry[0] === 'string' && typeof entry[1] === 'boolean'),
    )
    : {};

  return {excludedPatterns, hiddenKnown, layerStatus};
}
