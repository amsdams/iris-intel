import {h} from 'preact';
import type {IitcIrisPortalSummary} from '../messages/entities';
import {isAndroidHost} from '../platform/assets';
import '../ui/action-button/action-button.css';
import '../ui/button/button.css';
import './portal-directions.css';

/** Use coordinates rather than a name search: portal names need not identify a Maps place. */
export function getPortalDirections(portal: Pick<IitcIrisPortalSummary, 'latE6' | 'lngE6' | 'title'>): {
  google: string; bing: string; osm: string; osmDirections: string; geo: string;
} | undefined {
  const lat = portal.latE6 / 1e6;
  const lng = portal.lngE6 / 1e6;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
  const coordinates = `${lat},${lng}`;
  const encodedName = encodeURIComponent(portal.title ?? '');
  return {
    // Google's current Maps URL format accepts an exact coordinate query without a place-name suffix.
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`,
    bing: `https://www.bing.com/maps/?v=2&cp=${lat}~${lng}&lvl=16&sp=Point.${lat}_${lng}_${encodedName}___`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`,
    osmDirections: `https://www.openstreetmap.org/directions?to=${encodeURIComponent(coordinates)}#map=16/${lat}/${lng}`,
    // IITC Mobile uses a direct coordinate intent for compatibility with other map apps.
    geo: `geo:${coordinates}`,
  };
}

export function PortalDirections({portal}: {portal: IitcIrisPortalSummary}): h.JSX.Element | null {
  const links = getPortalDirections(portal);
  if (!links) return null;
  const android = isAndroidHost();
  return <details className="iitc-iris-portal-section">
    <summary className="iitc-iris-section-summary">Map links</summary>
    <div className="iitc-iris-portal-map-links" aria-label="Portal map links">
      {([['Google Maps', links.google], ['Bing Maps', links.bing], ['OpenStreetMap', links.osm]] as const)
        .map(([name, href]) => <a key={name} className="iitc-iris-button iitc-iris-portal-action" href={href}
          target={android ? '_self' : '_blank'} rel="noopener noreferrer" title={`Open this portal location in ${name}`}>
          {name}
        </a>)}
      <a className="iitc-iris-button iitc-iris-portal-action" href={links.osmDirections}
        target={android ? '_self' : '_blank'} rel="noopener noreferrer" title="Plan a route to this portal in OpenStreetMap">
        OSM directions
      </a>
      {android && <a className="iitc-iris-button iitc-iris-portal-action" href={links.geo}
        title="Open this portal location in a compatible maps app">Other maps…</a>}
    </div>
  </details>;
}
