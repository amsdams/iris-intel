import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

interface SystemTabProps {
    onAction: (action: string) => void;
    showMap: boolean;
    onClose: () => void;
}

export function SystemTab({ onAction, showMap, onClose }: SystemTabProps): JSX.Element {
    const menuItems = useStore((state) => state.menuItems);

    return (
        <Fragment>
            <DrawerSection label="Iris Core">
                <DrawerButton icon="🧩" label="Manager" onClick={() => onAction('plugins')} />
                <DrawerButton icon="⚙️" label="Display" onClick={() => onAction('settings')} />
                <DrawerButton icon="🛠️" label="Debug" onClick={() => onAction('diag')} />
                <DrawerButton icon="🔄" label={showMap ? 'Intel' : 'IRIS'} onClick={() => onAction('toggle')} />
            </DrawerSection>
            
            {menuItems.length > 0 && (
                <DrawerSection label="Plugin Actions" scroll>
                    {menuItems.map(m => (
                        <DrawerButton
                            key={m.id}
                            icon="📦"
                            label={m.label}
                            onClick={() => {
                                m.onClick();
                                onClose();
                            }}
                        />
                    ))}
                </DrawerSection>
            )}
        </Fragment>
    );
}
