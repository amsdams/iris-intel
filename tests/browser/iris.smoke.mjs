import {test as base, expect} from '@playwright/test';

const button = (page, name) => page.getByRole('button', {name, exact: true});
async function openPanel(page, menu, panel) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  if (panel) {
    const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: panel, exact: true});
    if (await secondary.getAttribute('aria-pressed') !== 'true') await secondary.click();
  }
}
async function theme(page, name) {
  await openPanel(page, 'System', 'Appearance');
  await page.getByLabel('Appearance', {exact: true}).getByRole('button', {name, exact: true}).click();
}
async function surface(locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['backgroundColor', 'color', 'border', 'borderRadius', 'font', 'height']
      .map(property => [property, style[property]]));
  });
}

const test = base.extend({page: async ({page}, use) => {
  // No real Intel requests or map tiles. Every test gets an isolated browser context.
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('.iitc-iris-sheet-tabbar')).toBeVisible();
  await use(page);
  expect(errors, 'Uncaught browser/console errors').toEqual([]);
}});

test('Appearance persists across reload and follows System only when selected', async ({page}) => {
  await theme(page, 'Light');
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-theme', 'light');
  await openPanel(page, 'System', 'Appearance');
  await expect(page.getByLabel('Appearance', {exact: true}).getByRole('button', {name: 'Light', exact: true}))
    .toHaveAttribute('aria-pressed', 'true');
  await theme(page, 'System');
  await page.emulateMedia({colorScheme: 'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-theme', 'dark');
  await page.emulateMedia({colorScheme: 'light'});
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-theme', 'light');
  await theme(page, 'Dark');
  await page.emulateMedia({colorScheme: 'light'});
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-theme', 'dark');
});

test('Search, COMM, Passcode, and Diagnostics share input surfaces and aligned actions', async ({page}, testInfo) => {
  const backgrounds = [];
  for (const appearance of ['Light', 'Dark']) {
    await test.step(`${appearance}: matching fields, submit heights, and button corners`, async () => {
      await theme(page, appearance);
      await openPanel(page, 'Map', 'Search');
      const searchBox = page.locator('.iitc-iris-search-box');
      const search = await surface(searchBox);
      // Compare typography on the actual field: Firefox resolves an input's line height
      // differently from its surrounding form, which supplies the visible surface.
      search.font = await searchBox.locator('input').evaluate(input => getComputedStyle(input).font);
      backgrounds.push(search.backgroundColor);
      expect(search.backgroundColor).not.toBe('rgb(0, 0, 0)');
      for (const [menu, panel, selector] of [
        ['COMM', null, '.iitc-iris-comm-send-form'],
        ['Agent', 'Passcode', '.iitc-iris-passcode-form'],
        ['System', 'Diagnostics', '.iitc-iris-jump'],
      ]) {
        await openPanel(page, menu, panel);
        const form = page.locator(selector);
        await expect(form).toBeVisible();
        expect(await surface(form.locator('input'))).toEqual(search);
        const action = form.locator('button[type="submit"]');
        await expect(action).toBeDisabled();
        await expect(action).toHaveCSS('height', search.height);
        await expect(action).toHaveCSS('border-radius', '4px');
        expect((await action.boundingBox()).y).toBe((await form.locator('input').boundingBox()).y);
      }
      for (const name of ['Logout', 'Jump']) await expect(button(page, name)).toHaveCSS('border-radius', '4px');
      await testInfo.attach(`diagnostics-${appearance.toLowerCase()}`, {body: await page.screenshot(), contentType: 'image/png'});
      const details = page.locator('details.iitc-iris-system-debug');
      await expect(details).not.toHaveAttribute('open');
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open');
      await details.locator('summary').click();
      await expect(details).not.toHaveAttribute('open');
    });
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
});

test('Diagnostics keeps disclosure preferences, timing settings and JSON export after cleanup', async ({page}) => {
  await openPanel(page, 'System', 'Diagnostics');
  const panel = page.getByRole('complementary', {name: 'System controls'});
  const details = panel.locator('details');
  await expect(details).not.toHaveAttribute('open');
  await expect(details.locator('.iitc-iris-debug-row').first()).not.toBeVisible();
  for (const name of ['Start Fast', 'Start Delay', 'Copy Runs', 'AMS 10', 'AMS 15', 'DAM 15', 'Debug']) {
    await expect(panel.getByRole('button', {name, exact: true})).toHaveCount(0);
  }
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details.locator('.iitc-iris-debug-row').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('iitc-iris:debug-dock'))).toBe('true');
  const delay = panel.getByRole('button', {name: 'IITC Delay', exact: true});
  await expect(delay).toHaveAttribute('aria-pressed', 'false');
  await delay.click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iitc-iris:lifecycle-settings'))))
    .toEqual({iitcMovementDelay: true});
  await page.reload();
  await expect(details).toHaveAttribute('open');
  await expect(delay).toHaveAttribute('aria-pressed', 'true');
  await details.locator('summary').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('iitc-iris:debug-dock'))).toBe('false');
  // Exercise export while counters are hidden, without requiring OS clipboard access.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
    writeText: async text => {window.copiedDiagnostics = JSON.parse(text);},
  }}));
  await panel.getByRole('button', {name: 'JSON', exact: true}).click();
  await expect(panel).toContainText('json copied');
  expect(await page.evaluate(() => ({app: window.copiedDiagnostics.app,
    lifecycle: window.copiedDiagnostics.lifecycleSettings, entities: Boolean(window.copiedDiagnostics.entities),
    requests: Boolean(window.copiedDiagnostics.requests)})))
    .toEqual({app: 'IITC IRIS', lifecycle: {iitcMovementDelay: true}, entities: true, requests: true});
  await page.reload();
  await expect(details).not.toHaveAttribute('open');
});

test('Jump rejects empty submissions, accepts Enter, and reports malformed input', async ({page}) => {
  for (const appearance of ['Light', 'Dark']) {
    await theme(page, appearance);
    await openPanel(page, 'System', 'Diagnostics');
    const form = page.locator('.iitc-iris-jump');
    const input = form.locator('input');
    const jump = form.getByRole('button', {name: 'Jump', exact: true});
    for (const value of ['', '   ']) {
      await input.fill(value);
      await expect(jump).toBeDisabled();
      // requestSubmit exercises the handler even with a disabled button.
      await form.evaluate(element => element.requestSubmit());
      await expect(form).not.toContainText('bad view');
    }
    await input.fill('52.4,4.8,15');
    await expect(jump).toBeEnabled();
    await input.press('Enter');
    await expect(form).toContainText('jumped');
    await expect.poll(() => page.evaluate(() => {
      const center = window.__iitcIrisMap.getCenter();
      return Math.abs(center.lat - 52.4) < 0.0001 && Math.abs(center.lng - 4.8) < 0.0001;
    })).toBe(true);
    await input.fill('not coordinates');
    await jump.click();
    await expect(form).toContainText('bad view');
    await expect(form).not.toContainText('bad view');
  }
});
