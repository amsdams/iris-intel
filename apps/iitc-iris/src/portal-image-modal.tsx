import {h} from 'preact';
import type {IitcIrisSelectedPortal} from './messages';

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
  if (!isOpen || !portal?.image) return null;

  return (
    <div
      className="iitc-iris-image-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Portal image preview"
      onClick={onClose}
    >
      <div className="iitc-iris-image-preview" onClick={(event) => event.stopPropagation()}>
        <div className="iitc-iris-request-panel-header">
          <span className="iitc-iris-selected-title">{portal.title || 'Portal image'}</span>
          <span className="iitc-iris-panel-header-actions">
            <button
              className="iitc-iris-clear-selection"
              type="button"
              onClick={onClose}
              title="Close image preview"
              aria-label="Close image preview"
            >
              X
            </button>
          </span>
        </div>
        <img src={portal.image} alt={portal.title || 'Portal image'} />
        <div className="iitc-iris-image-preview-caption">
          <b>{portal.title || 'Selected portal'}</b>
          <span>{portal.guid}</span>
        </div>
      </div>
    </div>
  );
}
