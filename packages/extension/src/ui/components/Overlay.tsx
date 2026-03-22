import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@ittca/core';
import { MapOverlay } from './MapOverlay';

export function ITTCAOverlay() {
  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  const statsItems = useStore((state) => state.statsItems);
  
  const [showMap, setShowMap] = useState(true);
  const [locStatus, setLocStatus] = useState('NAVIGATE TO ME');

  const portalCount = Object.keys(portals).length;
  const linkCount = Object.keys(links).length;
  const fieldCount = Object.keys(fields).length;

  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocStatus('LOCATING...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        window.postMessage({
          type: 'ITTCA_MOVE_MAP',
          center: { lat: latitude, lng: longitude },
          zoom: 15
        }, '*');
        setLocStatus('NAVIGATE TO ME');
      },
      (error) => {
        setLocStatus('NAVIGATE TO ME');
        let msg = 'Location error: ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg += 'Permission denied. Please check macOS/Chrome settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg += 'Position unavailable.';
            break;
          case error.TIMEOUT:
            msg += 'Request timed out.';
            break;
          default:
            msg += 'Unknown error.';
            break;
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <Fragment>
      <div style={{ display: showMap ? 'block' : 'none' }}>
        <MapOverlay />
      </div>
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
        pointerEvents: 'auto',
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>ITTCA POC</h1>
        <p style={{ margin: 0 }}>Portals: {portalCount}</p>
        <p style={{ margin: 0 }}>Links: {linkCount}</p>
        <p style={{ margin: 0 }}>Fields: {fieldCount}</p>
        {Object.values(statsItems).map((item) => (
          <p key={item.id} style={{ margin: 0 }}>
            {item.label}: {typeof item.value === 'function' ? item.value() : item.value}
          </p>
        ))}
        
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button 
            onClick={() => setShowMap(!showMap)}
            style={{
              background: '#00ffff',
              color: '#000',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {showMap ? 'SHOW INTEL MAP' : 'SHOW ITTCA MAP'}
          </button>
          
          <button 
            onClick={goToMyLocation}
            disabled={locStatus === 'LOCATING...'}
            style={{
              background: locStatus === 'LOCATING...' ? '#555' : '#00ffff',
              color: '#000',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: locStatus === 'LOCATING...' ? 'default' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {locStatus}
          </button>
        </div>
      </div>
    </Fragment>
  );
}
