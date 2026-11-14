import {h} from 'preact';
import {useState} from 'preact/hooks';
import type {IitcIrisPortalSummary} from '../messages/entities';
import {isAndroidHost} from '../platform/assets';
import '../ui/action-button/action-button.css';
import '../ui/button/button.css';
import './portal-directions.css';
import {ActionButton} from '../ui/action-button';
import {StatusText} from '../ui/status-text';
import {copyIitcIrisText} from '../shell/feedback';
import {useCopyFeedbackStatus} from '../shell/use-copy-feedback';
import {PortalQr} from './portal-qr';

export function getPortalPrimeLink(guid: string): string {
  return `https://link.ingress.com/portal/${encodeURIComponent(guid)}`;
}

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

export function PortalDirections({portal, inline = false}: {portal: IitcIrisPortalSummary; inline?: boolean}): h.JSX.Element | null {
  const links = getPortalDirections(portal);
  if (!links) return null;
  const android = isAndroidHost();
  const choices = <div className="iitc-iris-portal-map-links" aria-label="Portal map links">
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
    </div>;
  return inline ? choices : <details className="iitc-iris-portal-section">
    <summary className="iitc-iris-section-summary">Map links</summary>{choices}
  </details>;
}

export function PortalSharing({portal, copyTitle, copyLink, copyGuid, copyStatus}: {
  portal: IitcIrisPortalSummary; copyTitle: () => void; copyLink: () => void; copyGuid: () => void; copyStatus: string;
}): h.JSX.Element {
  const [showQr, setShowQr] = useState(false);
  const [primeStatus, setPrimeStatus] = useCopyFeedbackStatus();
  const [copySource, setCopySource] = useState<'prime' | 'title' | 'intel' | 'guid' | null>(null);
  const feedback = copySource === 'prime' ? primeStatus : copySource ? copyStatus : '';
  const copyButton = (source: NonNullable<typeof copySource>, label: string, action: () => void): h.JSX.Element => (
    <span className="iitc-iris-copy-action">
      <ActionButton aria-label={label} onClick={() => {setCopySource(source); action();}}>
        {copySource === source && feedback.includes('copied') ? 'Copied ✓' : label}
      </ActionButton>
      {copySource === source && feedback && <StatusText role="status">{feedback}</StatusText>}
    </span>
  );
  return <section aria-label="Share portal">
    <div className="iitc-iris-portal-map-links">
      {copyButton('title', 'Copy title', copyTitle)}
      {copyButton('intel', 'Copy Intel link', copyLink)}
      {copyButton('prime', 'Copy Prime link', () => {
        setPrimeStatus('');
        copyIitcIrisText(getPortalPrimeLink(portal.guid), {setStatus: setPrimeStatus, successStatus: 'Prime portal link copied'});
      })}
      <ActionButton aria-expanded={showQr} title="Show a QR code for this portal location"
        onClick={() => setShowQr(!showQr)}>{showQr ? 'Hide QR' : 'QR code'}</ActionButton>
    </div>
    {showQr && <PortalQr payload={`GEO:${portal.latE6 / 1e6},${portal.lngE6 / 1e6}`} />}
    <details><summary className="iitc-iris-section-summary">Advanced sharing</summary>
      {copyButton('guid', 'Copy GUID', copyGuid)}
    </details>
  </section>;
}
