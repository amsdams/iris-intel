import {h} from 'preact';
import {getIitcDataZoomForMapZoom, getIitcMapZoomTileParameters} from '@iris/iitc-core';
import {EmptyState} from '../ui/empty-state';
import {Section} from '../ui/section';

interface MapDataNoticeProps {
  cameraZoom: number;
  analysis?: boolean;
  enabledPortalDetails?: boolean;
}

/** Explain the current request's coverage; enabling a layer does not fetch missing portals. */
export function MapDataNotice({cameraZoom, analysis = false, enabledPortalDetails = false}: MapDataNoticeProps): h.JSX.Element | null {
  const params = getIitcMapZoomTileParameters(getIitcDataZoomForMapZoom(cameraZoom));
  if (params.hasPortals) return null;

  return (
    <Section aria-label="Map data availability">
      <EmptyState>
        {`${analysis ? 'Results use loaded map data. ' : ''}Zoom in to load full portal data, including unclaimed portals and portal levels.${
          analysis && params.minLinkLength > 0 ? ' Shorter links are also omitted at this zoom.' : ''
        }${enabledPortalDetails ? ' Enabled level labels and highlights use only known portal data.' : ''}`}
      </EmptyState>
    </Section>
  );
}
