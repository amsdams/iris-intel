import type { DrawToolsTarget } from './content-draw-tools';

export function formatMapContextLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function formatMapContextIntelUrl(lat: number, lng: number, zoom: number): string {
  return `https://intel.ingress.com/intel?ll=${lat.toFixed(6)},${lng.toFixed(6)}&z=${Math.round(zoom)}`;
}

export function formatPortalIntelUrl(portal: { latE6: number; lngE6: number }, zoom: number): string {
  const lat = (portal.latE6 / 1_000_000).toFixed(6);
  const lng = (portal.lngE6 / 1_000_000).toFixed(6);
  const z = Math.max(17, Math.round(zoom));
  return `https://intel.ingress.com/intel?ll=${lat},${lng}&z=${z}&pll=${lat},${lng}`;
}

export function formatAnchorPortalGuids(portalGuids: readonly string[]): string {
  return portalGuids.join('\n');
}

export function getDrawToolsTargetFromContext(
  selectedPortal: { latE6: number; lngE6: number; title?: string; guid: string } | null,
  mapContext: { lat: number; lng: number } | null,
): DrawToolsTarget | null {
  if (selectedPortal) {
    const lat = selectedPortal.latE6 / 1_000_000;
    const lng = selectedPortal.lngE6 / 1_000_000;
    return {
      lat,
      lng,
      label: selectedPortal.title || selectedPortal.guid,
    };
  }
  if (mapContext) {
    return {
      lat: mapContext.lat,
      lng: mapContext.lng,
      label: `${mapContext.lat.toFixed(6)}, ${mapContext.lng.toFixed(6)}`,
    };
  }
  return null;
}
