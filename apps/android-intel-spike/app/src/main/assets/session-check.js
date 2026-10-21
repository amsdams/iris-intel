/* Runs only in the top-level Intel page. No credentials or response body cross into native diagnostics. */
(() => {
  if (location.origin !== 'https://intel.ingress.com') return;
  const key = __IRIS_PROBE_KEY__;
  const finish = (status) => { window[key] = status; };
  finish('Checking Intel session…');
  if (!window.PLAYER || typeof window.PLAYER.nickname !== 'string' || !window.PLAYER.nickname) {
    finish('Intel has not exposed a signed-in player. Finish login, then check again.');
    return;
  }
  const cookie = document.cookie.split(';').map((value) => value.trim()).find((value) => value.startsWith('csrftoken='));
  let version = '';
  for (const script of document.querySelectorAll('script[src*="gen_dashboard_"]')) {
    const match = script.src.match(/gen_dashboard_([a-f0-9]+)\.js/);
    if (match) { version = match[1]; break; }
  }
  if (!version) {
    const params = window.niantic_params;
    if (typeof params?.CURRENT_VERSION === 'string') version = params.CURRENT_VERSION;
    else if (typeof params?.frontendVersion === 'string') version = params.frontendVersion;
  }
  if (!cookie || !version) {
    finish('Signed-in player detected; Intel request metadata is not ready. Wait, then check again.');
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  fetch('/r/getHasActiveSubscription', {
    method: 'POST', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
    headers: {
      'Accept': 'application/json', 'Content-Type': 'application/json; charset=utf-8',
      'X-CSRFToken': cookie.slice(cookie.indexOf('=') + 1), 'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({v: version}),
  }).then(async (response) => {
    if (!response.ok) { finish(`Intel request failed (HTTP ${response.status}).`); return; }
    const data = await response.json();
    if (data && typeof data === 'object' && !Array.isArray(data) && !data.error && typeof data.result === 'boolean') {
      finish('PASS: signed-in Intel player and authenticated request confirmed. Close and reopen the app, then check again.');
    } else {
      finish('Intel responded, but authentication was not confirmed. Finish login or retry.');
    }
  }).catch(() => finish('Intel request could not be verified. Check login and connection, then retry.'))
    .finally(() => clearTimeout(timeout));
})();
