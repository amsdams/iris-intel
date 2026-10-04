import {h} from 'preact';
import {getCommTeamClass} from '../comm/comm-display';
import {formatIitcColorVars, getIitcLevelColor, getIitcRarityColor, IITC_RESONATOR_ENERGY} from '../iitc-colors';
import {PORTAL_DETAIL_SECTION_REGISTRY, type IitcIrisPortalDetailSectionId} from './portal-detail-section-registry';
import type {IitcIrisMissionsState, IitcIrisPortalDetailsState, IitcIrisSelectedPortal} from '../messages';
import {formatElapsedSeconds, getAuthErrorMessage, getPanelStatusClass} from '../ui-status';
import {ActionButton} from '../ui/action-button';
import {ClearButton} from '../ui/clear-button';
import {PlainDiagnosticsChip} from '../ui/diagnostics-chip';
import {PanelFooter, PanelTitle} from '../ui/panel';
import {StatusText} from '../ui/status-text';
import {EmptyState} from '../ui/empty-state';

export interface IitcIrisPortalDetailsPanelProps {
  activeSidePanel: string | null;
  closePortalDetails: () => void;
  copySelectedPortalGuid: () => void;
  copySelectedPortalLink: () => void;
  copySelectedPortalTitle: () => void;
  copyStatus: string;
  focusSelectedPortal: () => void;
  inlineAuthActions: h.JSX.Element;
  openPortalImage: () => void;
  openSelectedPortalMissions: () => void;
  portal: IitcIrisSelectedPortal;
  portalDetails: IitcIrisPortalDetailsState | null | undefined;
  portalMissionState: IitcIrisMissionsState | null;
  portalSections: Record<IitcIrisPortalDetailSectionId, boolean>;
  setPortalSectionOpen: (section: IitcIrisPortalDetailSectionId, open: boolean) => void;
}

function formatPortalHealth(portal: IitcIrisSelectedPortal): string {
  if (portal.isPlaceholder || portal.health === undefined) return '-';
  return `${Math.round(portal.health)}%`;
}

function formatPortalHealthPercent(portal: IitcIrisSelectedPortal): number {
  if (portal.isPlaceholder || portal.health === undefined || !Number.isFinite(portal.health)) return 0;
  return Math.max(0, Math.min(100, Math.round(portal.health)));
}

function formatTeamClass(team: string): string {
  if (team === 'E') return 'iitc-iris-team-enl';
  if (team === 'R') return 'iitc-iris-team-res';
  if (team === 'M') return 'iitc-iris-team-machina';
  return 'iitc-iris-team-neutral';
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatResonatorEnergy(energy: number): string {
  return energy >= 1000 ? `${Math.round(energy / 100) / 10}k` : String(energy);
}

function formatResonatorEnergyPercent(level: number, energy: number): number {
  const normalizedLevel = Math.max(0, Math.min(8, Math.floor(level)));
  const maxEnergy = IITC_RESONATOR_ENERGY[normalizedLevel] ?? 1000;
  return Math.max(0, Math.min(100, Math.round((energy / maxEnergy) * 100)));
}

function formatModName(name: string): string {
  return name.replace(/^Portal\s+/i, '').replace(/_/g, ' ');
}

function formatModStats(stats: Record<string, string | number>): string {
  const preferredStats = ['MITIGATION', 'REMOVAL_STICKINESS', 'FORCE_AMPLIFIER', 'LINK_RANGE_MULTIPLIER', 'HACK_SPEED', 'HIT_BONUS', 'ATTACK_FREQUENCY'];
  const parts: string[] = [];
  for (const key of preferredStats) {
    const value = stats[key];
    if (value !== undefined) parts.push(`${key.toLowerCase().replace(/_/g, ' ')} ${value}`);
  }
  return parts.slice(0, 2).join(', ');
}

function getPortalMissionSummary(
  portal: IitcIrisSelectedPortal,
  portalDetails: IitcIrisPortalDetailsState | null | undefined,
  portalMissionState: IitcIrisMissionsState | null,
): {hasMissions: boolean; summary: string} {
  const hasMissions = Boolean(
    portal.mission ||
    portal.mission50plus ||
    portalDetails?.hasMissionsStartingHere ||
    portalMissionState,
  );
  const summary = portalMissionState
    ? portalMissionState.status === 'loading'
      ? 'Loading'
      : portalMissionState.status === 'empty'
        ? '0 starting here'
        : portalMissionState.status === 'ready'
          ? `${formatInteger(portalMissionState.missions.length)} starting here`
          : portalMissionState.status
    : portal.mission50plus
      ? '50+ starting here'
      : hasMissions
        ? 'Starting here'
        : '';
  return {hasMissions, summary};
}

function PortalDetailSection(props: {
  children: h.JSX.Element;
  portalSections: Record<IitcIrisPortalDetailSectionId, boolean>;
  sectionId: IitcIrisPortalDetailSectionId;
  setPortalSectionOpen: (section: IitcIrisPortalDetailSectionId, open: boolean) => void;
}): h.JSX.Element {
  const section = PORTAL_DETAIL_SECTION_REGISTRY.find((entry) => entry.id === props.sectionId);
  return <details
    className="iitc-iris-portal-section"
    open={props.portalSections[props.sectionId]}
    onToggle={(event) => props.setPortalSectionOpen(props.sectionId, event.currentTarget.open)}
  >
    <summary className="iitc-iris-section-summary">{section?.label ?? props.sectionId}</summary>
    {props.children}
  </details>;
}

const RESONATOR_PANEL_ORDER: (number | null)[] = [0, 1, 2, 3, null, 4, 5, 6, 7];

export function IitcIrisPortalDetailsPanel(props: IitcIrisPortalDetailsPanelProps): h.JSX.Element {
  const {portal, portalDetails, portalMissionState} = props;
  const detailsStatus = portalDetails?.status ?? 'waiting';
  const {hasMissions, summary: missionSummary} = getPortalMissionSummary(portal, portalDetails, portalMissionState);

  return <aside className={`iitc-iris-portal-side-panel ${formatTeamClass(portal.team)} ${props.activeSidePanel ? 'iitc-iris-portal-side-panel-stacked' : ''}`} aria-label="Selected portal details">
    <div className="iitc-iris-portal-side-header">
      {portal.image ? (
        <button className="iitc-iris-selected-image-button" type="button" onClick={props.openPortalImage} title="Open portal image preview">
          <img className="iitc-iris-selected-image" src={portal.image} alt="" />
        </button>
      ) : (
        <span className="iitc-iris-selected-image-placeholder" title="No portal image">No image</span>
      )}
      <div className="iitc-iris-portal-side-title">
        <span className="iitc-iris-selected-title-row">
          <PanelTitle title={portal.guid}>
            {portal.title || portal.guid}
          </PanelTitle>
          <StatusText className={`iitc-iris-panel-state ${getPanelStatusClass(detailsStatus)}`}>
            {detailsStatus}
          </StatusText>
        </span>
        {portalDetails?.owner && (
          <span className="iitc-iris-portal-owner-prominent" title={`Owner: ${portalDetails.owner}`}>
            <small>owner</small>
            <b className={getCommTeamClass(portal.team)}>{portalDetails.owner}</b>
          </span>
        )}
      </div>
      <span className="iitc-iris-panel-header-actions">
        <ClearButton onClick={props.closePortalDetails} title="Close portal details" aria-label="Close portal details" />
      </span>
    </div>
    <div className="iitc-iris-portal-scroll-body">
      <div className="iitc-iris-portal-actions" aria-label="Selected portal actions">
        <ActionButton onClick={props.focusSelectedPortal} title="Center and zoom to this portal">Zoom</ActionButton>
        <ActionButton onClick={props.copySelectedPortalTitle} title="Copy portal title">Title</ActionButton>
        <ActionButton onClick={props.copySelectedPortalLink} title="Copy Intel portal link">Link</ActionButton>
        <ActionButton onClick={props.copySelectedPortalGuid} title="Copy portal GUID">GUID</ActionButton>
        {hasMissions && (
          <ActionButton onClick={props.openSelectedPortalMissions} title="Fetch missions starting at this portal">Missions</ActionButton>
        )}
        {props.copyStatus && <StatusText>{props.copyStatus}</StatusText>}
      </div>
      <div className="iitc-iris-portal-summary">
        <span className="iitc-iris-portal-summary-cell">
          <StatusText>level</StatusText>
          <b className="iitc-iris-portal-level-value" style={formatIitcColorVars(getIitcLevelColor(portal.level))}>
            {portal.isPlaceholder || portal.level === undefined ? '-' : `L${portal.level}`}
          </b>
        </span>
        <span className="iitc-iris-portal-summary-cell">
          <StatusText>health</StatusText>
          <b>{formatPortalHealth(portal)}</b>
          <span className="iitc-iris-summary-mini-track" aria-hidden="true">
            <span style={`width: ${formatPortalHealthPercent(portal)}%;`} />
          </span>
        </span>
        <span className="iitc-iris-portal-summary-cell">
          <StatusText>res</StatusText>
          <b>{portal.resCount !== undefined ? `${portal.resCount}/8` : '-'}</b>
        </span>
        <span className="iitc-iris-portal-summary-cell">
          <StatusText>links</StatusText>
          <b>{portal.links.count}</b>
        </span>
      </div>
      <div className="iitc-iris-portal-panel">
        <div className="iitc-iris-portal-panel-header">
          <StatusText>details</StatusText>
          <span className="iitc-iris-panel-header-actions">
            {portalDetails?.error && (
              <StatusText className="iitc-iris-warning" title={portalDetails.error}>
                {getAuthErrorMessage(portalDetails.status, portalDetails.error)}
              </StatusText>
            )}
            {detailsStatus === 'auth' && props.inlineAuthActions}
          </span>
        </div>
          {detailsStatus !== 'ready' && (
            <EmptyState>
              {detailsStatus === 'loading' ? 'Fetching portal details...' : 'Waiting for portal details.'}
            </EmptyState>
          )}
        {portalDetails?.status === 'ready' && (
          <>
            <PortalDetailSection sectionId="mods" portalSections={props.portalSections} setPortalSectionOpen={props.setPortalSectionOpen}>
              <div className="iitc-iris-mod-grid">
                {Array.from({ length: 4 }, (_, index) => {
                  const mod = portalDetails.mods?.[index];
                  const modStats = mod ? formatModStats(mod.stats) : '';
                  return (
                    <div
                      className={`iitc-iris-slot iitc-iris-mod-slot ${mod ? '' : 'iitc-iris-empty-slot'}`}
                      key={`mod-${index}`}
                      style={formatIitcColorVars(getIitcRarityColor(mod?.rarity))}
                    >
                      {mod ? (
                        <>
                          <span className="iitc-iris-portal-mod-name">{mod.rarity.replace(/_/g, ' ')} {formatModName(mod.name)}</span>
                          <StatusText className={`iitc-iris-agent-name ${getCommTeamClass(portal.team)}`}>{mod.owner}</StatusText>
                          {modStats && <StatusText>{modStats}</StatusText>}
                        </>
                      ) : (
                        <StatusText>empty</StatusText>
                      )}
                    </div>
                  );
                })}
              </div>
            </PortalDetailSection>
            <PortalDetailSection sectionId="resonators" portalSections={props.portalSections} setPortalSectionOpen={props.setPortalSectionOpen}>
              <div className="iitc-iris-resonator-grid">
                {RESONATOR_PANEL_ORDER.map((resonatorIndex, panelIndex) => {
                  if (resonatorIndex === null) {
                    return (
                      <span className="iitc-iris-slot iitc-iris-resonator-center" key="portal-center" title={portal.title || portal.guid}>
                        portal
                      </span>
                    );
                  }
                  const resonator = portalDetails.resonators?.[resonatorIndex];
                  const resonatorHealth = resonator ? formatResonatorEnergyPercent(resonator.level, resonator.energy) : 0;
                  return (
                    <span
                      className={`iitc-iris-slot iitc-iris-resonator-slot ${resonator ? '' : 'iitc-iris-empty-slot'}`}
                      key={`resonator-${panelIndex}`}
                      style={resonator ? `${formatIitcColorVars(getIitcLevelColor(resonator.level)) ?? ''}` : undefined}
                      title={resonator ? `${resonator.owner} ${resonator.energy} XM, ${resonatorHealth}% charged` : 'empty resonator slot'}
                    >
                      {resonator ? (
                        <>
                          <span className="iitc-iris-resonator-level">L{resonator.level}</span>
                          <span className="iitc-iris-resonator-energy">{formatResonatorEnergy(resonator.energy)}</span>
                          <span className={`iitc-iris-resonator-owner ${getCommTeamClass(portal.team)}`}>{resonator.owner}</span>
                          <span className="iitc-iris-resonator-percent">{resonatorHealth}%</span>
                          <span className="iitc-iris-resonator-fill" style={`width: ${resonatorHealth}%;`} />
                        </>
                      ) : (
                        <StatusText>empty</StatusText>
                      )}
                    </span>
                  );
                })}
              </div>
            </PortalDetailSection>
            <PortalDetailSection sectionId="facts" portalSections={props.portalSections} setPortalSectionOpen={props.setPortalSectionOpen}>
              <div className="iitc-iris-portal-panel-grid iitc-iris-portal-facts">
                <StatusText>owner</StatusText>
                <span className={`iitc-iris-agent-name ${getCommTeamClass(portal.team)}`}>{portalDetails.owner || '-'}</span>
                <StatusText>mitigation</StatusText>
                <span>
                  {portalDetails.mitigation
                    ? `${Math.round(portalDetails.mitigation.total)} total, ${Math.round(portalDetails.mitigation.shields)} shields, ${Math.round(portalDetails.mitigation.links)} links`
                    : '-'}
                </span>
                <StatusText>history</StatusText>
                <span>
                  {portalDetails.history
                    ? [
                      portalDetails.history.captured ? 'captured' : 'not captured',
                      portalDetails.history.visited ? 'visited' : 'not visited',
                      portalDetails.history.scoutControlled ? 'scout controlled' : 'not scout controlled',
                    ].join(' / ')
                    : '-'}
                </span>
                <StatusText>topology</StatusText>
                <span>
                  {portal.links.count} links ({portal.links.outgoing} out/{portal.links.incoming} in), {portal.fields.count} fields
                </span>
                <StatusText>markers</StatusText>
                <span>
                  {portal.ornaments.length} ornaments, {portal.artifacts.length} artifacts
                  {(portal.mission || portal.mission50plus) && ', mission'}
                </span>
                <StatusText>missions</StatusText>
                <div>
                  {hasMissions ? (
                    <div className="iitc-iris-portal-mission-enrichment">
                      <span>
                        <small>missions</small>
                        <b>{missionSummary}</b>
                      </span>
                      <span className="iitc-iris-portal-mission-meta">
                        {portalMissionState
                          ? portalMissionState.cached
                            ? 'cached'
                            : portalMissionState.elapsedMs !== undefined
                              ? `request ${formatElapsedSeconds(portalMissionState.elapsedMs)}s`
                              : portalMissionState.status
                          : 'from portal details'}
                      </span>
                      <ActionButton onClick={props.openSelectedPortalMissions} disabled={portalMissionState?.status === 'loading'} title="Open missions starting at this portal">
                        {portalMissionState?.status === 'loading' ? 'Loading' : 'Open'}
                      </ActionButton>
                    </div>
                  ) : '-'}
                </div>
              </div>
            </PortalDetailSection>
            <PanelFooter>
              <PlainDiagnosticsChip
                title={[
                  'request: /r/getPortalDetails',
                  `guid: ${portal.guid}`,
                ].join('\n')}
              >
                {portalDetails.cached ? 'cached' : portalDetails.elapsedMs !== undefined ? `request ${formatElapsedSeconds(portalDetails.elapsedMs)}s` : 'request'}
              </PlainDiagnosticsChip>
            </PanelFooter>
          </>
        )}
      </div>
    </div>
  </aside>;
}
