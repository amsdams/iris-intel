import {planIitcCommRequest, validateIitcCommResponse, validateIitcCommSendResponse,
  type IitcCommBounds, type IitcCommChannel, type IitcCommChannelData, type IitcCommSendPlextPostData} from '@iris/iitc-core';
import {getCsrfToken, extractVersion, looksLikeHtml, createIitcAuthError, type IntelRequest} from '../intel/intel-request';

interface CommTransport {
  fetchComm: (version: string, tab: IitcCommChannel, bounds: IitcCommBounds | undefined,
    storageHash: IitcCommChannelData, getOlderMsgs: boolean, signal?: AbortSignal) => Promise<unknown>;
  postSendPlext: (payload: IitcCommSendPlextPostData, signal?: AbortSignal) => Promise<unknown>;
}

export function createCommTransport(fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText']): CommTransport {
  async function fetchComm(
    version: string,
    tab: IitcCommChannel,
    bounds: IitcCommBounds | undefined,
    storageHash: IitcCommChannelData,
    getOlderMsgs: boolean,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getPlexts missing csrftoken');
    if (!bounds) throw new Error('getPlexts missing map bounds');
    const postData = planIitcCommRequest({
      channel: tab,
      bounds,
      storageHash,
      getOlderMsgs,
      version,
    });

    const {response, text} = await fetchIitcEndpointText('getPlexts', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(postData),
    }, tab === 'all' ? 'comm-all' : `comm-${tab}`);

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('getPlexts', response);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (error) {
      if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`, {cause: error});
      throw error;
    }
    if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`);
    const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
    if (typeof error === 'string' && error) throw new Error(error);
    validateIitcCommResponse(parsed);
    return parsed;
  }

  async function postSendPlext(payload: IitcCommSendPlextPostData, signal?: AbortSignal): Promise<unknown> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('sendPlext missing csrftoken');
    const version = extractVersion();
    if (!version) throw new Error('sendPlext missing Intel version');

    const {response, text} = await fetchIitcEndpointText('sendPlext', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({...payload, v: version}),
    }, `comm-send-${payload.tab}`);

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('sendPlext', response);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (error) {
      if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`, {cause: error});
      throw error;
    }
    if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`);
    validateIitcCommSendResponse(parsed);
    return parsed;
  }

  return {fetchComm, postSendPlext};
}
