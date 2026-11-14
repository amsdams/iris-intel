import {h} from 'preact';
import {useRef} from 'preact/hooks';
import {useDialogFocus} from '../../ui/dialog/use-dialog-focus';
import '../../ui/panel/panel.css';
import './portal-image-preview.css';
import type {IitcIrisSelectedPortal} from '../../messages';
import {ClearButton} from '../../ui/clear-button';
import {PanelHeader, PanelTitle} from '../../ui/panel';

interface IitcIrisPortalImageModalProps {
  isOpen: boolean;
  portal: IitcIrisSelectedPortal | null;
  onClose: () => void;
}

export function IitcIrisPortalImageModal({
  isOpen,
  portal,
  onClose,
}: IitcIrisPortalImageModalProps): h.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, Boolean(isOpen && portal?.image));
  if (!isOpen || !portal?.image) return null;

  return (
    <div
      className="iitc-iris-image-preview-backdrop"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Portal image preview"
      onClick={onClose}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') {event.preventDefault(); onClose();}
      }}
    >
      <div className="iitc-iris-image-preview" onClick={(event) => event.stopPropagation()}>
        <PanelHeader>
          <PanelTitle>{portal.title || 'Portal image'}</PanelTitle>
          <span className="iitc-iris-panel-header-actions">
            <ClearButton
              onClick={onClose}
              title="Close image preview"
              aria-label="Close image preview"
            />
          </span>
        </PanelHeader>
        <img src={portal.image} alt={portal.title || 'Portal image'} />
        <div className="iitc-iris-image-preview-caption">
          <b>{portal.title || 'Selected portal'}</b>
          <span>{portal.guid}</span>
        </div>
      </div>
    </div>
  );
}
