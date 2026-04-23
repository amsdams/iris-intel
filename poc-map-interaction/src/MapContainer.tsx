import { h, JSX } from 'preact';

interface MapContainerProps {
    isVis: boolean;
}

export function MapContainer({ isVis }: MapContainerProps): JSX.Element {
    return (
        <div 
            id="map-poc-container" 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                background: '#222', 
                zIndex: 1000000, 
                display: isVis ? 'block' : 'none', 
                pointerEvents: 'auto' 
            }} 
        />
    );
}
