import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from "../../theme";
import './filters.css';

interface LayersPopupProps {
    onClose: () => void;
}

export function LayersPopup({ onClose }: LayersPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const showFields = useStore((state) => state.showFields);
    const toggleShowFields = useStore((state) => state.toggleShowFields);
    const showLinks = useStore((state) => state.showLinks);
    const toggleShowLinks = useStore((state) => state.toggleShowLinks);
    const showOrnaments = useStore((state) => state.showOrnaments);
    const toggleShowOrnaments = useStore((state) => state.toggleShowOrnaments);
    const showArtifacts = useStore((state) => state.showArtifacts);
    const toggleShowArtifacts = useStore((state) => state.toggleShowArtifacts);

    return (
        <Popup
            onClose={onClose}
            title="Map Layers"
            className="iris-popup-top-center iris-popup-small"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-filters">
                <label className="iris-choice-item iris-label">
                    <input type="checkbox" checked={showFields} onChange={toggleShowFields} className="iris-checkbox" />
                    Fields
                </label>

                <label className="iris-choice-item iris-label iris-mt-2">
                    <input type="checkbox" checked={showLinks} onChange={toggleShowLinks} className="iris-checkbox" />
                    Links
                </label>

                <label className="iris-choice-item iris-label iris-mt-2">
                    <input type="checkbox" checked={showOrnaments} onChange={toggleShowOrnaments} className="iris-checkbox" />
                    Ornaments
                </label>

                <label className="iris-choice-item iris-label iris-mt-2">
                    <input type="checkbox" checked={showArtifacts} onChange={toggleShowArtifacts} className="iris-checkbox" />
                    Artifacts
                </label>
            </div>
        </Popup>
    );
}
