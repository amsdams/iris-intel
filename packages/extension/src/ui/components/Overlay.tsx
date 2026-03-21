import { h, Fragment } from 'preact';
import { useStore } from '@ittca/core';
import { MapOverlay } from './MapOverlay';

export function ITTCAOverlay() {
  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  
  const portalCount = Object.keys(portals).length;
  const linkCount = Object.keys(links).length;
  const fieldCount = Object.keys(fields).length;

  return (
    <Fragment>
      <MapOverlay />
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50px',
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ffff',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #00ffff',
        boxShadow: '0 0 10px #00ffff',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>ITTCA POC</h1>
        <p style={{ margin: 0 }}>Portals: {portalCount}</p>
        <p style={{ margin: 0 }}>Links: {linkCount}</p>
        <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
      </div>
    </Fragment>
  );
}
