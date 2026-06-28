import type {CircleMarkerOptions} from 'leaflet';
import type {IitcIrisPortalHighlighterId, IitcIrisRenderPortal} from './messages';

export interface IitcIrisPortalHighlighterStyleContext {
  portal: IitcIrisRenderPortal;
  history?: NonNullable<IitcIrisRenderPortal['history']>;
}

export interface IitcIrisPortalHighlighterRegistryEntry {
  id: IitcIrisPortalHighlighterId;
  label: string;
  title: string;
  levelFill?: boolean;
  healthFill?: boolean;
  getStyle?: (context: IitcIrisPortalHighlighterStyleContext) => Partial<CircleMarkerOptions>;
}

const IITC_HISTORY_MARKED_STYLE: Partial<CircleMarkerOptions> = {fillColor: 'red', fillOpacity: 1};
const IITC_HISTORY_SEMI_MARKED_STYLE: Partial<CircleMarkerOptions> = {fillColor: 'yellow', fillOpacity: 1};

export const PORTAL_HIGHLIGHTER_REGISTRY: IitcIrisPortalHighlighterRegistryEntry[] = [
  {id: 'none', label: 'None', title: 'No portal highlighter'},
  {id: 'level-color', label: 'Level color', title: 'Color portal bodies by level', levelFill: true},
  {id: 'needs-recharge', label: 'Needs recharge', title: 'Color damaged portals by health', healthFill: true},
  {
    id: 'history-visited',
    label: 'Visited',
    title: 'Highlight visited portals',
    getStyle: ({history}): Partial<CircleMarkerOptions> => history?.visited ? IITC_HISTORY_SEMI_MARKED_STYLE : {},
  },
  {
    id: 'history-not-visited',
    label: 'Not visited',
    title: 'Highlight unvisited portals',
    getStyle: ({history}): Partial<CircleMarkerOptions> => !history?.visited ? IITC_HISTORY_MARKED_STYLE : {},
  },
  {
    id: 'history-captured',
    label: 'Captured',
    title: 'Highlight captured portals',
    getStyle: ({history}): Partial<CircleMarkerOptions> => history?.captured ? IITC_HISTORY_SEMI_MARKED_STYLE : {},
  },
  {
    id: 'history-not-captured',
    label: 'Not captured',
    title: 'Highlight uncaptured portals',
    getStyle: ({history}): Partial<CircleMarkerOptions> => !history?.captured ? IITC_HISTORY_MARKED_STYLE : {},
  },
  {
    id: 'history-scout-controlled',
    label: 'Scout controlled',
    title: 'Highlight scout-controlled portals',
    getStyle: ({history}): Partial<CircleMarkerOptions> => history?.scoutControlled ? IITC_HISTORY_SEMI_MARKED_STYLE : {},
  },
  {
    id: 'history-not-scout-controlled',
    label: 'Not scout controlled',
    title: 'Highlight portals not scout controlled',
    getStyle: ({history}): Partial<CircleMarkerOptions> => !history?.scoutControlled ? IITC_HISTORY_MARKED_STYLE : {},
  },
];

export const DEFAULT_HIGHLIGHTER_ID: IitcIrisPortalHighlighterId = 'none';

export function isPortalHighlighterId(value: unknown): value is IitcIrisPortalHighlighterId {
  return PORTAL_HIGHLIGHTER_REGISTRY.some((entry) => entry.id === value);
}

export function normalizePortalHighlighterId(value: unknown): IitcIrisPortalHighlighterId {
  if (isPortalHighlighterId(value)) return value;
  if (value === 'history-visited-captured') return 'history-visited';
  if (value === 'history-not-visited-captured') return 'history-not-visited';
  return DEFAULT_HIGHLIGHTER_ID;
}

export function getPortalHighlighter(id: IitcIrisPortalHighlighterId): IitcIrisPortalHighlighterRegistryEntry {
  return PORTAL_HIGHLIGHTER_REGISTRY.find((entry) => entry.id === id) ?? PORTAL_HIGHLIGHTER_REGISTRY[0];
}
