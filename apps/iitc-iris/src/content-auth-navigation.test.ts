import {describe, expect, it, vi} from 'vitest';
import {
  calculateSidePanelStatus,
  formatAuthRecoveryText,
  getAuthSources,
  performIntelLoginRedirect,
  retryActiveAuthPanelRequest,
} from './content-auth-navigation';

describe('content-auth-navigation', () => {
  it('reloads intel page when already on /intel', () => {
    const reload = vi.fn();
    const assign = vi.fn();
    const mockElement = {remove: vi.fn()} as unknown as HTMLElement;

    performIntelLoginRedirect('bypass-key', 300000, mockElement, {
      origin: 'https://intel.ingress.com',
      pathname: '/intel',
      reload,
      assign,
    });

    expect(mockElement.remove).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('routes auth retries to active side panel', () => {
    const callbacks = {
      refreshComm: vi.fn(),
      refreshScores: vi.fn(),
      refreshInventory: vi.fn(),
      refreshMissions: vi.fn(),
      requestSearch: vi.fn(),
      searchTerm: '',
      passcodeDraft: '',
      passcodeState: {status: 'idle', requestState: 'idle'} as const,
      retryPasscode: vi.fn(),
      retryMapFetch: vi.fn(),
    };

    retryActiveAuthPanelRequest('comm', 'comm', 'all', 'view', callbacks);
    expect(callbacks.refreshComm).toHaveBeenCalledWith('all');
    expect(callbacks.retryMapFetch).not.toHaveBeenCalled();

    retryActiveAuthPanelRequest(null, 'map', 'all', 'view', callbacks);
    expect(callbacks.retryMapFetch).toHaveBeenCalled();
  });

  it('routes auth retries to passcode redemption when a passcode is available', () => {
    const callbacks = {
      refreshComm: vi.fn(),
      refreshScores: vi.fn(),
      refreshInventory: vi.fn(),
      refreshMissions: vi.fn(),
      requestSearch: vi.fn(),
      searchTerm: 'active search',
      passcodeDraft: '  PASS-123  ',
      passcodeState: {status: 'auth', requestState: 'auth'} as const,
      retryPasscode: vi.fn(),
      retryMapFetch: vi.fn(),
    };

    retryActiveAuthPanelRequest('passcode', 'search', 'all', 'view', callbacks);

    expect(callbacks.retryPasscode).toHaveBeenCalledWith('PASS-123');
    expect(callbacks.requestSearch).not.toHaveBeenCalled();
    expect(callbacks.retryMapFetch).not.toHaveBeenCalled();
  });

  it('calculates side panel status and identifies auth sources', () => {
    const states = {
      entityFetch: {authRequired: true},
      selectedPortalDetails: {status: 'ready'},
      commState: {status: 'auth'},
      scoresState: {status: 'idle'},
      missionsState: {status: 'idle'},
      inventoryState: {status: 'idle'},
      passcodeState: {status: 'idle'},
      agentState: {status: 'idle'},
    };

    expect(calculateSidePanelStatus('comm', states)).toBe('auth');
    expect(calculateSidePanelStatus('scores', states)).toBe('idle');
    expect(getAuthSources(states)).toEqual(['map', 'COMM']);
    expect(formatAuthRecoveryText(['map', 'COMM'])).toBe('2 requests need an authenticated Intel session');
    expect(formatAuthRecoveryText(['map'])).toBe('map needs an authenticated Intel session');
    expect(formatAuthRecoveryText([])).toBe('');
  });
});
