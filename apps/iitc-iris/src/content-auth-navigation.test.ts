import {describe, expect, it, vi} from 'vitest';
import {
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
      retryMapFetch: vi.fn(),
    };

    retryActiveAuthPanelRequest('comm', 'comm', 'all', 'view', callbacks);
    expect(callbacks.refreshComm).toHaveBeenCalledWith('all');
    expect(callbacks.retryMapFetch).not.toHaveBeenCalled();

    retryActiveAuthPanelRequest(null, 'map', 'all', 'view', callbacks);
    expect(callbacks.retryMapFetch).toHaveBeenCalled();
  });
});
