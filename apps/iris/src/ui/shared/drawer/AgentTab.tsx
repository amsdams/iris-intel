import { h, JSX, Fragment } from 'preact';
import {DrawerButton, DrawerSection} from './DrawerControls';

interface AgentTabProps {
    onAction: (action: string) => void;
}

export function AgentTab({ onAction }: AgentTabProps): JSX.Element {
    return (
        <Fragment>
            <DrawerSection label="Agent Tools">
                <DrawerButton icon="👤" label="Stats" onClick={() => onAction('stats')} />
                <DrawerButton icon="🎒" label="Items" onClick={() => onAction('inventory')} />
                <DrawerButton icon="💬" label="COMM" onClick={() => onAction('comm')} />
                <DrawerButton icon="🔑" label="Codes" onClick={() => onAction('passcodes')} />
            </DrawerSection>
            <DrawerSection label="MU Scores">
                <DrawerButton icon="📊" label="Global" onClick={() => onAction('gameScore')} />
                <DrawerButton icon="📉" label="Cell" onClick={() => onAction('regionScore')} />
            </DrawerSection>
        </Fragment>
    );
}
