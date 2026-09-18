import {h} from 'preact';
import {getPanelStatusClass} from './ui-status';
import {IitcIrisAgentPanel} from './agent-panel';
import {IitcIrisCommPanel} from './comm-panel';
import {IitcIrisInventoryPanel} from './inventory-panel';
import {IitcIrisMissionsPanel} from './missions-panel';
import {IitcIrisPasscodePanel} from './passcode-panel';
import {IitcIrisScoresPanel} from './scores-panel';
import {type IitcIrisSidePanelId} from './menu-registry';
import {
  type IitcIrisAgentState,
  type IitcIrisCommState,
  type IitcIrisCommTab,
  type IitcIrisInventoryState,
  type IitcIrisMissionSource,
  type IitcIrisMissionsState,
  type IitcIrisPasscodeState,
  type IitcIrisScoresState,
} from './messages';

export interface IitcIrisRequestSidePanelContainerProps {
  activeSidePanel: IitcIrisSidePanelId | null;
  activeSidePanelOption: { id: string; label: string; title: string };
  activeSidePanelStatus: string;
  activePanelNeedsAuth: boolean;
  inlineAuthActions: h.JSX.Element;
  closeSidePanel: () => void;

  agentState: IitcIrisAgentState;

  commState: IitcIrisCommState;
  commDraft: string;
  commListRef: import('preact').RefObject<HTMLDivElement>;
  commNewBelow: boolean;
  commUserAtBottom: boolean;
  addCommNickname: (nickname: string) => void;
  handleCommScroll: () => void;
  jumpCommToLatest: () => void;
  refreshComm: (tab?: IitcIrisCommTab) => void;
  requestOlderComm: () => void;
  selectCommPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void;
  selectCommTab: (tab: IitcIrisCommTab) => void;
  sendComm: () => void;
  setCommDraft: (draft: string) => void;

  scoresState: IitcIrisScoresState;
  refreshScores: () => void;

  missionsState: IitcIrisMissionsState;
  cameraZoom: number;
  hasSelectedPortal: boolean;
  refreshMissions: (source?: IitcIrisMissionSource) => void;
  requestMissionDetails: (missionGuid: string) => void;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;
  zoomToMission: () => void;

  inventoryState: IitcIrisInventoryState;
  refreshInventory: () => void;

  passcodeState: IitcIrisPasscodeState;
  passcodeDraft: string;
  setPasscodeDraft: (draft: string) => void;
  redeemPasscode: () => void;
}

export function IitcIrisRequestSidePanelContainer(props: IitcIrisRequestSidePanelContainerProps): h.JSX.Element {
  const {
    activeSidePanel,
    activeSidePanelOption,
    activeSidePanelStatus,
    activePanelNeedsAuth,
    inlineAuthActions,
    closeSidePanel,
    agentState,
    commState,
    commDraft,
    commListRef,
    commNewBelow,
    commUserAtBottom,
    addCommNickname,
    handleCommScroll,
    jumpCommToLatest,
    refreshComm,
    requestOlderComm,
    selectCommPortal,
    selectCommTab,
    sendComm,
    setCommDraft,
    scoresState,
    refreshScores,
    missionsState,
    cameraZoom,
    hasSelectedPortal,
    refreshMissions,
    requestMissionDetails,
    zoomToAndShowPortal,
    zoomToMission,
    inventoryState,
    refreshInventory,
    passcodeState,
    passcodeDraft,
    setPasscodeDraft,
    redeemPasscode,
  } = props;

  return (
    <aside className="iitc-iris-request-side-panel" aria-label={`${activeSidePanelOption.title} panel`}>
      <div className="iitc-iris-request-panel-header">
        <span className="iitc-iris-selected-title">{activeSidePanelOption.label}</span>
        <span className="iitc-iris-panel-header-actions">
          <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(activeSidePanelStatus)}`}>
            {activeSidePanelStatus}
          </span>
          {activePanelNeedsAuth && inlineAuthActions}
          <button
            className="iitc-iris-clear-selection"
            type="button"
            onClick={closeSidePanel}
            title={`Close ${activeSidePanelOption.title}`}
            aria-label={`Close ${activeSidePanelOption.title}`}
          >
            X
          </button>
        </span>
      </div>
      {activeSidePanel === 'agent' && (
        <IitcIrisAgentPanel agentState={agentState} />
      )}
      {activeSidePanel === 'comm' && (
        <IitcIrisCommPanel
          addNickname={addCommNickname}
          commDraft={commDraft}
          commListRef={commListRef}
          commNewBelow={commNewBelow}
          commState={commState}
          commUserAtBottom={commUserAtBottom}
          jumpToLatest={jumpCommToLatest}
          onDraftChange={setCommDraft}
          onScroll={handleCommScroll}
          refresh={refreshComm}
          requestOlder={requestOlderComm}
          selectPortal={selectCommPortal}
          selectTab={selectCommTab}
          send={sendComm}
        />
      )}
      {activeSidePanel === 'scores' && (
        <IitcIrisScoresPanel refresh={refreshScores} scoresState={scoresState} />
      )}
      {activeSidePanel === 'missions' && (
        <IitcIrisMissionsPanel
          cameraZoom={cameraZoom}
          hasSelectedPortal={hasSelectedPortal}
          missionsState={missionsState}
          refreshMissions={refreshMissions}
          requestMissionDetails={requestMissionDetails}
          zoomToAndShowPortal={zoomToAndShowPortal}
          zoomToMission={zoomToMission}
        />
      )}
      {activeSidePanel === 'inventory' && (
        <IitcIrisInventoryPanel
          inventoryState={inventoryState}
          refresh={refreshInventory}
          zoomToAndShowPortal={zoomToAndShowPortal}
        />
      )}
      {activeSidePanel === 'passcode' && (
        <IitcIrisPasscodePanel
          onDraftChange={setPasscodeDraft}
          passcodeDraft={passcodeDraft}
          passcodeState={passcodeState}
          redeem={redeemPasscode}
        />
      )}
    </aside>
  );
}
