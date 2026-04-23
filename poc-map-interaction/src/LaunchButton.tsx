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
                bottom: isVis ? '15px' : '20px', 
                right: isVis ? 'auto' : '20px',
                left: isVis ? '20px' : 'auto',
                width: '50px', 
                height: '50px', 
                background: isVis ? 'rgba(20,20,20,0.9)' : '#000', 
                color: '#00ffff', 
                border: '2px solid #00ffff', 
                borderRadius: '50%', 
                zIndex: 1000010, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '14px', 
                boxShadow: '0 0 15px rgba(0,255,255,0.4)', 
                pointerEvents: 'auto',
                transition: 'all 0.3s ease'
            }}
        >
            {isVis ? 'X' : '3D'}
        </div>
    );
}
