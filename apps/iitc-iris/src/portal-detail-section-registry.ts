export type IitcIrisPortalDetailSectionId = 'mods' | 'resonators' | 'facts';

export interface IitcIrisPortalDetailSectionRegistryEntry {
  id: IitcIrisPortalDetailSectionId;
  label: string;
  defaultOpen: boolean;
}

export const PORTAL_DETAIL_SECTION_REGISTRY: IitcIrisPortalDetailSectionRegistryEntry[] = [
  {id: 'mods', label: 'Mods', defaultOpen: true},
  {id: 'resonators', label: 'Resonators', defaultOpen: true},
  {id: 'facts', label: 'Facts', defaultOpen: false},
];

export const DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS: Record<IitcIrisPortalDetailSectionId, boolean> =
  Object.fromEntries(PORTAL_DETAIL_SECTION_REGISTRY.map((entry) => [entry.id, entry.defaultOpen])) as Record<IitcIrisPortalDetailSectionId, boolean>;

export function isPortalDetailSectionId(value: unknown): value is IitcIrisPortalDetailSectionId {
  return PORTAL_DETAIL_SECTION_REGISTRY.some((entry) => entry.id === value);
}
