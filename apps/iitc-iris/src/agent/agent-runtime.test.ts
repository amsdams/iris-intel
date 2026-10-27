import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createAgentRuntime} from './agent-runtime';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisSubscriptionState} from '../messages';

const player = {nickname: 'Agent', team: 'RESISTANCE', verified_level: '8', level: 7, ap: '150',
  min_ap_for_current_level: '100', min_ap_for_next_level: '300', energy: '500', xm_capacity: '1000', available_invites: '2'};
describe('Agent page profile', () => {
  let subscription: IitcIrisSubscriptionState;
  let runtime: ReturnType<typeof createAgentRuntime>;
  beforeEach(() => {
    vi.stubGlobal('window', {PLAYER: {...player}, postMessage: vi.fn()});
    subscription = {status: 'unknown'};
    runtime = createAgentRuntime(() => subscription);
  });
  afterEach(() => vi.unstubAllGlobals());
  function setPlayer(value: unknown): void {(window as Window & {PLAYER?: unknown}).PLAYER = value;}

  it('converts Intel numeric strings and verified level into AP/XM progress', () => {
    expect(runtime.getIitcAgentState()).toEqual({status: 'ready', nickname: 'Agent', team: 'R', level: 8,
      ap: 150, minApForCurrentLevel: 100, minApForNextLevel: 300, energy: 500, xmCapacity: 1000,
      availableInvites: 2, levelPercent: 25, xmPercent: 50, apToNextLevel: 150, maxLevel: false,
      staticFromPage: true, subscription});
  });

  it('publishes fresh page and subscription values instead of capturing either at construction', () => {
    subscription = {status: 'active', hasActive: true};
    setPlayer({...player, team: 'ENLIGHTENED', nickname: 'Other', verified_level: NaN, level: '9'});
    runtime.postAgentState();
    const message = vi.mocked(window.postMessage).mock.calls[0][0] as IitcIrisMessage;
    expect(message).toMatchObject({type: IITC_IRIS_MESSAGES.agentStatus,
      agent: {nickname: 'Other', team: 'E', level: 9, subscription}});
    for (const team of ['E', 'R', 'M', undefined]) {
      setPlayer({...player, team});
      expect(runtime.getIitcAgentState().team).toBe(team === 'E' || team === 'R' ? team : 'N');
    }
  });

  it('retains maximum level and missing/invalid metric handling', () => {
    setPlayer({...player, min_ap_for_next_level: 0, energy: 'bad', xm_capacity: 0});
    expect(runtime.getIitcAgentState()).toMatchObject({maxLevel: true, levelPercent: 100,
      apToNextLevel: undefined, energy: undefined, xmPercent: undefined});
    setPlayer({...player, ap: 500, energy: -20});
    expect(runtime.getIitcAgentState()).toMatchObject({levelPercent: 100, apToNextLevel: 0, xmPercent: 0});
    setPlayer({...player, ap: undefined, energy: 2000});
    expect(runtime.getIitcAgentState()).toMatchObject({maxLevel: false, levelPercent: undefined, xmPercent: 100});
  });

  it('reports missing PLAYER/nickname without requesting subscription data', () => {
    const getSubscription = vi.fn(() => subscription);
    const fresh = createAgentRuntime(getSubscription);
    for (const value of [undefined, {}, {nickname: ''}, {nickname: 123}]) {
      setPlayer(value);
      expect(fresh.getIitcAgentState()).toEqual({status: 'missing'});
    }
    expect(getSubscription).not.toHaveBeenCalled();
  });
});
