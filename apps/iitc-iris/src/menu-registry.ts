export type IitcIrisPrimaryMenuId = 'selected' | 'map' | 'agent' | 'comm' | 'system';
export type IitcIrisSidePanelId = 'agent' | 'comm' | 'scores' | 'missions' | 'inventory' | 'passcode';
export type IitcIrisSelectedKind = 'portal' | 'link' | 'field';
export type IitcIrisSheetId =
  | 'map'
  | 'layers'
  | 'view'
  | 'drawLinks'
  | 'drawMarkers'
  | 'portalCounts'
  | 'portalsList'
  | 'scoreboard'
  | 'search'
  | 'portal'
  | 'selectedLink'
  | 'selectedField'
  | 'system'
  | 'help'
  | IitcIrisSidePanelId;

export interface IitcIrisPrimaryMenuRegistryEntry {
  id: IitcIrisPrimaryMenuId;
  label: string;
  shortcut: string;
}

export interface IitcIrisSheetRegistryEntry {
  id: IitcIrisSheetId;
  label: string;
  title: string;
  primaryMenu: IitcIrisPrimaryMenuId;
  selectedKind?: IitcIrisSelectedKind;
  sidePanel?: boolean;
}

export const PRIMARY_MENU_REGISTRY: IitcIrisPrimaryMenuRegistryEntry[] = [
  {id: 'selected', label: 'Selected', shortcut: 'P'},
  {id: 'map', label: 'Map', shortcut: 'M'},
  {id: 'agent', label: 'Agent', shortcut: 'A'},
  {id: 'comm', label: 'COMM', shortcut: 'C'},
  {id: 'system', label: 'System', shortcut: 'S'},
];

export const SHEET_REGISTRY: IitcIrisSheetRegistryEntry[] = [
  {id: 'map', label: 'Map', title: 'Map', primaryMenu: 'map'},
  {id: 'search', label: 'Search', title: 'Search', primaryMenu: 'map'},
  {id: 'layers', label: 'Display', title: 'Display', primaryMenu: 'map'},
  {id: 'view', label: 'Controls', title: 'Controls', primaryMenu: 'map'},
  {id: 'missions', label: 'Missions', title: 'Missions', primaryMenu: 'map', sidePanel: true},
  {id: 'scores', label: 'Scores', title: 'Scores', primaryMenu: 'map', sidePanel: true},
  {id: 'portalCounts', label: 'Counts', title: 'Portal counts', primaryMenu: 'map'},
  {id: 'portalsList', label: 'List', title: 'Portals list', primaryMenu: 'map'},
  {id: 'scoreboard', label: 'Scoreboard', title: 'Scoreboard', primaryMenu: 'map'},
  {id: 'drawLinks', label: 'Links', title: 'Drawn links', primaryMenu: 'map'},
  {id: 'drawMarkers', label: 'Markers', title: 'Drawn markers', primaryMenu: 'map'},
  {id: 'portal', label: 'Details', title: 'Portal details', primaryMenu: 'selected', selectedKind: 'portal'},
  {id: 'selectedLink', label: 'Details', title: 'Link details', primaryMenu: 'selected', selectedKind: 'link'},
  {id: 'selectedField', label: 'Details', title: 'Field details', primaryMenu: 'selected', selectedKind: 'field'},
  {id: 'agent', label: 'Profile', title: 'Agent status', primaryMenu: 'agent', sidePanel: true},
  {id: 'inventory', label: 'Inventory', title: 'Inventory', primaryMenu: 'agent', sidePanel: true},
  {id: 'passcode', label: 'Passcode', title: 'Passcode redemption', primaryMenu: 'agent', sidePanel: true},
  {id: 'comm', label: 'COMM', title: 'COMM messages', primaryMenu: 'comm', sidePanel: true},
  {id: 'system', label: 'Diagnostics', title: 'Diagnostics', primaryMenu: 'system'},
  {id: 'help', label: 'Shortcuts', title: 'Shortcuts', primaryMenu: 'system'},
];

const SIDE_PANEL_IDS_IN_UI_ORDER: IitcIrisSidePanelId[] = ['agent', 'comm', 'scores', 'missions', 'inventory', 'passcode'];

export const SIDE_PANEL_REGISTRY = SIDE_PANEL_IDS_IN_UI_ORDER
  .map((id) => SHEET_REGISTRY.find((entry) => entry.id === id && entry.sidePanel))
  .filter((entry): entry is IitcIrisSheetRegistryEntry & {id: IitcIrisSidePanelId; sidePanel: true} => Boolean(entry));
export const MAP_MENU_SHEET_REGISTRY = SHEET_REGISTRY.filter((entry) => entry.primaryMenu === 'map' && entry.id !== 'map');
export const SELECTED_MENU_SHEET_REGISTRY = SHEET_REGISTRY.filter((entry) => entry.primaryMenu === 'selected');
export const AGENT_MENU_SHEET_REGISTRY = SHEET_REGISTRY.filter((entry) => entry.primaryMenu === 'agent' && entry.id !== 'scores');
export const SYSTEM_MENU_SHEET_REGISTRY = SHEET_REGISTRY.filter((entry) => entry.primaryMenu === 'system');

export function isPrimaryMenuId(value: unknown): value is IitcIrisPrimaryMenuId {
  return PRIMARY_MENU_REGISTRY.some((entry) => entry.id === value);
}

export function isSheetId(value: unknown): value is IitcIrisSheetId {
  return SHEET_REGISTRY.some((entry) => entry.id === value);
}

export function isSidePanelId(value: unknown): value is IitcIrisSidePanelId {
  return SIDE_PANEL_REGISTRY.some((entry) => entry.id === value);
}

export function getPrimaryMenuId(sheet: IitcIrisSheetId): IitcIrisPrimaryMenuId {
  return SHEET_REGISTRY.find((entry) => entry.id === sheet)?.primaryMenu ?? 'map';
}
