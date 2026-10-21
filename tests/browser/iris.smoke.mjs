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
      const search = await surface(page.locator('.iitc-iris-search-box'));
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
      for (const name of ['Logout', 'Debug', 'Jump']) await expect(button(page, name)).toHaveCSS('border-radius', '4px');
      await testInfo.attach(`diagnostics-${appearance.toLowerCase()}`, {body: await page.screenshot(), contentType: 'image/png'});
      const debug = button(page, 'Debug');
      const pressed = await debug.getAttribute('aria-pressed');
      await debug.click();
      await expect(debug).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true');
    });
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
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
