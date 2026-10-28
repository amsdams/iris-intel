import {useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisMessage} from '../messages';
import {
  jumpToViewInputAction,
  locateBrowserPositionAction,
} from './location-actions';

interface LocationWorkflowParams {
  cameraZoom: number;
  setMapView: (lat: number, lng: number, zoom?: number) => void;
  postMessage: (message: IitcIrisMessage) => void;
}

interface LocationWorkflow {
  viewInput: string;
  setViewInput: Dispatch<StateUpdater<string>>;
  viewInputStatus: string;
  geolocationStatus: string;
  jumpToViewInput: () => void;
  locateBrowserPosition: () => void;
}

export function useLocationWorkflow({cameraZoom, setMapView, postMessage}: LocationWorkflowParams): LocationWorkflow {
  const [viewInput, setViewInput] = useState('');
  const [viewInputStatus, setViewInputStatus] = useState('');
  const [geolocationStatus, setGeolocationStatus] = useState('');

  const jumpToViewInput = (): void => {
    jumpToViewInputAction(viewInput, cameraZoom, setMapView, setViewInputStatus);
  };

  const locateBrowserPosition = (): void => {
    locateBrowserPositionAction(
      Boolean(navigator.geolocation),
      (success, error, options) => navigator.geolocation.getCurrentPosition(success, error, options),
      setMapView,
      setGeolocationStatus,
      postMessage
    );
  };

  return {viewInput, setViewInput, viewInputStatus, geolocationStatus,
    jumpToViewInput, locateBrowserPosition};
}
