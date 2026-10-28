import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createInventoryRuntime} from './inventory-runtime';
import {IITC_IRIS_MESSAGES, type IitcIrisRequestDiagnostics} from '../../messages';

type Options = Parameters<typeof createInventoryRuntime>[0];
const key = {resource: {resourceType: 'PORTAL_LINK_KEY'}, portalCoupler: {portalGuid: 'portal', portalTitle: 'Portal'}};
const inventory = {result: [['loose', 1, key], ['capsule', 1, {resource: {resourceType: 'KEY_CAPSULE'},
  moniker: {differentiator: 'CAPS'}, container: {currentCapacity: 100, currentCount: 2,
    stackableItems: [{itemGuids: ['a', 'b'], exampleGameEntity: ['a', 1, key]}]}}]]};

function pending(): {promise: Promise<unknown>; resolve: (value: unknown) => void} {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(done => {resolve = done;});
  return {promise, resolve};
}

describe('Inventory and shared subscription ownership', () => {
  let options: Options;
  let post: ReturnType<typeof vi.fn<Options['postIntelEndpoint']>>;
  let portal: ReturnType<Options['getSelectedPortal']>;
  let runtime: ReturnType<typeof createInventoryRuntime>;
  beforeEach(() => {
    vi.stubGlobal('window', {postMessage: vi.fn()});
    portal = {guid: 'portal', title: 'Selected portal'};
    post = vi.fn<Options['postIntelEndpoint']>().mockImplementation(async endpoint => endpoint === 'getInventory' ? inventory : {result: true});
    options = {getSelectedPortal: (): ReturnType<Options['getSelectedPortal']> => portal, postIntelEndpoint: post,
      getIitcRequestDiagnostics: (): IitcIrisRequestDiagnostics => ({}) as IitcIrisRequestDiagnostics, postAgentState: vi.fn(), onInventoryChanged: vi.fn()};
    runtime = createInventoryRuntime(options);
  });
  afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers();});

  it('retains key/capsule counts, selected-portal changes and page-lifetime inventory after map disposal', async () => {
    expect(runtime.getPortalKeyCount('portal')).toBeUndefined();
    await runtime.refreshInventory();
    expect(post).toHaveBeenCalledWith('getInventory', {lastQueryTimestamp: 0}, expect.any(AbortSignal));
    expect(runtime.getState()).toMatchObject({status: 'ready', subscription: {status: 'active'}, keys: 3, capsules: 1,
      selectedPortalGuid: 'portal', selectedPortalTitle: 'Selected portal',
      portalKeysForSelectedPortal: {total: 3, capsule: 2, loose: 1, capsules: {CAPS: 2}}});
    expect(runtime.getPortalKeyCount('portal')).toBe(3);
    expect(runtime.getPortalKeyCount('unknown')).toBe(0);
    runtime.dispose();
    expect(runtime.getSubscriptionState().status).toBe('active');
    portal = {};
    runtime.selectedPortalChanged();
    expect(runtime.getState()).toMatchObject({status: 'ready', keys: 3, portalKeysForSelectedPortal: null});
    portal = {guid: 'portal', title: 'Replacement selection'};
    runtime.selectedPortalChanged();
    expect(runtime.getState()).toMatchObject({selectedPortalTitle: 'Replacement selection', portalKeysForSelectedPortal: {total: 3}});
  });

  it('updates GUID key lookups after accepted inventory and retains them after a failed refresh', async () => {
    await runtime.refreshInventory();
    expect(runtime.getPortalKeyCount('portal')).toBe(3);
    post.mockImplementation(async endpoint => endpoint === 'getInventory'
      ? {result: [['other', 1, {...key, portalCoupler: {portalGuid: 'other', portalTitle: 'Other'}}]]} : {result: true});
    await runtime.refreshInventory();
    expect(runtime.getPortalKeyCount('portal')).toBe(0);
    expect(runtime.getPortalKeyCount('other')).toBe(1);
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? {result: []} : {result: true});
    await runtime.refreshInventory();
    expect(runtime.getState().status).toBe('error');
    expect(runtime.getPortalKeyCount('portal')).toBe(0);
    expect(runtime.getPortalKeyCount('other')).toBe(1);
    expect(options.onInventoryChanged).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent subscription checks and notifies Agent before Inventory', async () => {
    const request = pending();
    post.mockReturnValue(request.promise);
    const order: string[] = [];
    options.postAgentState = (): void => {order.push('agent');};
    vi.mocked(window.postMessage).mockImplementation(() => {order.push('inventory');});
    runtime = createInventoryRuntime(options);
    const first = runtime.refreshSubscriptionStatus();
    const second = runtime.refreshSubscriptionStatus();
    expect(post).toHaveBeenCalledOnce();
    expect(runtime.getSubscriptionState().status).toBe('loading');
    request.resolve({result: true});
    expect((await first).status).toBe('active');
    expect((await second).status).toBe('active');
    expect(order).toEqual(['agent', 'inventory', 'agent', 'inventory']);
    expect(window.postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.inventoryStatus,
      inventory: runtime.getState(), requestDiagnostics: {}}, '*');
  });

  it('cancels Inventory while waiting for the shared subscription without requesting items afterward', async () => {
    const items = pending();
    const subscription = pending();
    post.mockImplementation(endpoint => endpoint === 'getInventory' ? items.promise : subscription.promise);
    const refresh = runtime.refreshInventory();
    runtime.cancelActiveInventoryFetch();
    const inventorySignal = post.mock.calls.find(call => call[0] === 'getInventory')?.[2];
    const subscriptionSignal = post.mock.calls.find(call => call[0] === 'getHasActiveSubscription')?.[2];
    expect(inventorySignal).toBeUndefined();
    expect(subscriptionSignal?.aborted).toBe(false);
    subscription.resolve({result: true});
    await runtime.refreshSubscriptionStatus();
    items.resolve(inventory);
    await refresh;
    expect(runtime.getState()).toMatchObject({status: 'idle', requestState: 'idle', items: 0, subscription: {status: 'active'}});
    expect(runtime.getPortalKeyCount('portal')).toBeUndefined();
    expect(post.mock.calls.filter(call => call[0] === 'getInventory')).toHaveLength(0);
  });

  it('waits for a shared active-subscription result before fetching inventory', async () => {
    const subscription = pending();
    post.mockImplementation(endpoint => endpoint === 'getInventory' ? Promise.resolve(inventory) : subscription.promise);
    const shared = runtime.refreshSubscriptionStatus();
    const refresh = runtime.refreshInventory();
    expect(post.mock.calls.map(call => call[0])).toEqual(['getHasActiveSubscription']);
    subscription.resolve({result: true});
    await Promise.all([shared, refresh]);
    expect(post.mock.calls.map(call => call[0])).toEqual(['getHasActiveSubscription', 'getInventory']);
    expect(runtime.getState()).toMatchObject({status: 'ready', keys: 3});
  });

  it.each([{result: false}, {}, {result: 'true'}])('does not fetch items when subscription eligibility is unavailable: %j', async response => {
    post.mockResolvedValue(response);
    await runtime.refreshInventory();
    expect(post.mock.calls.map(call => call[0])).toEqual(['getHasActiveSubscription']);
    expect(runtime.getState().status).toBe('error');
    expect(runtime.getState().error).toContain('C.O.R.E.');
  });

  it('disposes an old subscription without accepting its result or clearing the replacement request', async () => {
    const old = pending();
    const replacement = pending();
    post.mockReturnValueOnce(old.promise).mockReturnValueOnce(replacement.promise);
    const first = runtime.refreshSubscriptionStatus();
    runtime.dispose();
    expect(post.mock.calls[0][2]?.aborted).toBe(true);
    expect(runtime.getSubscriptionState()).toEqual({status: 'unknown'});
    const second = runtime.refreshSubscriptionStatus();
    old.resolve({result: true});
    await first;
    expect(runtime.getSubscriptionState().status).toBe('loading');
    const shared = runtime.refreshSubscriptionStatus();
    expect(post).toHaveBeenCalledTimes(2);
    replacement.resolve({result: false});
    await Promise.all([second, shared]);
    expect(runtime.getSubscriptionState()).toMatchObject({status: 'inactive', hasActive: false});
  });

  it('ignores superseded Inventory responses and derives selection at response time', async () => {
    const old = pending();
    post.mockImplementation(endpoint => endpoint === 'getInventory' ? old.promise : Promise.resolve({result: true}));
    const first = runtime.refreshInventory();
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith('getInventory', {lastQueryTimestamp: 0}, expect.any(AbortSignal)));
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? inventory : {result: true});
    portal = {guid: 'other', title: 'Other portal'};
    await runtime.refreshInventory();
    old.resolve({result: []});
    await first;
    expect(runtime.getState()).toMatchObject({status: 'ready', keys: 3, selectedPortalGuid: 'other', portalKeysForSelectedPortal: null});
  });

  it('reports auth failures without losing previous inventory and treats subscription results strictly', async () => {
    await runtime.refreshInventory();
    post.mockRejectedValue(new Error('getInventory missing csrftoken'));
    await runtime.refreshInventory();
    expect(runtime.getState()).toMatchObject({status: 'auth', keys: 3});
    expect(runtime.getSubscriptionState()).toMatchObject({status: 'auth', hasActive: false});
    post.mockResolvedValue({result: 'true'});
    await runtime.refreshSubscriptionStatus();
    expect(runtime.getSubscriptionState()).toMatchObject({status: 'error', hasActive: false});
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? {result: []} : {result: true});
    await runtime.refreshInventory();
    expect(runtime.getState()).toMatchObject({status: 'error', keys: 3, portalKeysForSelectedPortal: {total: 3}});
    expect(runtime.getState().error).toContain('Wait a few minutes');
  });

  it.each([{}, {result: false}, {result: null}, {result: [false]}])('rejects an invalid inventory result instead of reporting empty: %j', async response => {
    vi.useFakeTimers();
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? response : {result: true});
    const refresh = runtime.refreshInventory();
    await vi.runAllTimersAsync();
    await refresh;
    expect(post.mock.calls.filter(call => call[0] === 'getInventory')).toHaveLength(3);
    expect(runtime.getState()).toMatchObject({status: 'error', requestState: 'error'});
    expect(runtime.getState().error).toContain('unexpected inventory response');
    expect(runtime.getPortalKeyCount('portal')).toBeUndefined();
  });

  it('recovers from unexpected result shapes within one refresh', async () => {
    vi.useFakeTimers();
    const responses = [{}, {result: false}, inventory];
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? responses.shift() : {result: true});
    const refresh = runtime.refreshInventory();
    await vi.advanceTimersByTimeAsync(0);
    expect(runtime.getState().status).toBe('loading');
    expect(runtime.getState().error).toContain('Retrying (2/3)');
    await vi.runAllTimersAsync();
    await refresh;
    expect(runtime.getState()).toMatchObject({status: 'ready', keys: 3});
    expect(runtime.getState().error).toBeUndefined();
  });

  it('reports an empty response without immediately retrying a potentially throttled request', async () => {
    vi.useFakeTimers();
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? {result: []} : {result: true});
    const refresh = runtime.refreshInventory();
    await vi.runAllTimersAsync();
    await refresh;
    expect(runtime.getState()).toMatchObject({status: 'empty', requestState: 'ready', rawItems: 0});
    expect(post.mock.calls.filter(call => call[0] === 'getInventory')).toHaveLength(1);
  });

  it('cancels retry timers and lets reopening start a new request', async () => {
    vi.useFakeTimers();
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? {} : {result: true});
    const refresh = runtime.refreshInventory();
    await vi.advanceTimersByTimeAsync(0);
    runtime.cancelActiveInventoryFetch();
    await refresh;
    await vi.runAllTimersAsync();
    expect(post.mock.calls.filter(call => call[0] === 'getInventory')).toHaveLength(1);
    expect(runtime.getState()).toMatchObject({status: 'idle', requestState: 'idle'});
    post.mockImplementation(async endpoint => endpoint === 'getInventory' ? inventory : {result: true});
    await runtime.refreshInventory();
    expect(runtime.getState()).toMatchObject({status: 'ready', keys: 3});
  });

  it('retains cached items on cancellation and keeps failure feedback when selection changes', async () => {
    await runtime.refreshInventory();
    const held = pending();
    post.mockClear();
    post.mockImplementation(endpoint => endpoint === 'getInventory' ? held.promise : Promise.resolve({result: true}));
    const refresh = runtime.refreshInventory();
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith('getInventory', {lastQueryTimestamp: 0}, expect.any(AbortSignal)));
    runtime.cancelActiveInventoryFetch();
    expect(runtime.getState()).toMatchObject({status: 'ready', requestState: 'ready', keys: 3});
    held.resolve({result: []});
    await refresh;
    post.mockRejectedValue(new Error('getInventory failed: HTTP 503'));
    await runtime.refreshInventory();
    portal = {guid: 'other', title: 'Other portal'};
    runtime.selectedPortalChanged();
    expect(runtime.getState()).toMatchObject({status: 'error', keys: 3, selectedPortalGuid: 'other',
      error: 'getInventory failed: HTTP 503'});
  });
});
