import { h, JSX } from 'preact';

interface LaunchButtonProps {
    isVis: boolean;
    onClick: () => void;
}

export function LaunchButton({ isVis, onClick }: LaunchButtonProps): JSX.Element {
    return (
        <div 
            id="launch-3d-btn" 
            onClick={onClick} 
            style={{ 
                position: 'fixed', 
                bottom: '120px', 
                right: '10px', 
                width: '60px', 
                height: '60px', 
                background: '#000', 
                color: '#00ffff', 
                border: '2px solid #00ffff', 
                borderRadius: '50%', 
                zIndex: 1000010, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '16px', 
                boxShadow: '0 0 15px rgba(0,255,255,0.4)', 
                pointerEvents: 'auto' 
            }}
        >
            {isVis ? '3D' : '3D'}
        </div>
    );
}
