import {openPanel} from './navigation-fixture.mjs';
import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

test.beforeEach(installPortalFixture);
test.use({viewport: {width: 320, height: 780}, hasTouch: true});

for (const {menu, name, field} of [
  {menu: 'Map', name: 'Search', field: 'Search portal or address'},
  {menu: 'COMM', name: null, field: 'broadcast:'},
  {menu: 'Agent', name: 'Passcode', field: 'passcode'},
]) test(`${name ?? menu} stays usable above a simulated keyboard and safe areas without resizing the map`, async ({page}) => {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {height: innerHeight, width: innerWidth,
      offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1});
    Object.defineProperty(window, 'visualViewport', {value: viewport});
    window.testViewport = viewport;
  });
  await setupPortalMap(page);
  const panel = await openPanel(page, menu, name);
  const input = panel.getByPlaceholder(field, {exact: true});
  await input.fill('keep this text');
  const mapHeight = await page.evaluate(() => window.__iitcIrisMap.getSize().y);
  await page.evaluate(() => {
    const shell = document.querySelector('.iitc-iris-shell');
    for (const [side, value] of Object.entries({left: 24, right: 24, bottom: 18, top: 22})) {
      shell.style.setProperty(`--iitc-iris-safe-${side}`, `${value}px`);
    }
    Object.assign(window.testViewport, {height: 430, offsetTop: 65});
    window.testViewport.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => input.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 65 && rect.bottom <= 495 && element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  const geometry = await panel.evaluate(element => {
    const r = element.getBoundingClientRect(); return {top: r.top, left: r.left, right: r.right};
  });
  expect(geometry.top).toBeGreaterThanOrEqual(86);
  expect(geometry.left).toBeGreaterThanOrEqual(24);
  expect(geometry.right).toBeLessThanOrEqual(296);
  expect(await page.locator('nav[aria-label="Panels"]').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(477);
  expect(await page.evaluate(() => window.__iitcIrisMap.getSize().y)).toBe(mapHeight);
  await page.evaluate(() => {
    Object.assign(window.testViewport, {height: innerHeight, offsetTop: 0});
    window.testViewport.dispatchEvent(new Event('resize'));
  });
  await expect(input).toHaveValue('keep this text');
  await expect(input).toBeFocused();
});

test('larger text persists; layer groups remain usable and idle passcodes have no fake rewards', async ({page}) => {
  await setupPortalMap(page, 'light');
  let panel = await openPanel(page, 'System', 'Appearance');
  const normalFont = await panel.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await panel.getByRole('button', {name: 'Larger', exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-iitc-iris-text-size', 'larger');
  expect(await panel.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(normalFont);
  await page.reload();
  await expect(panel.getByRole('button', {name: 'Larger', exact: true})).toHaveAttribute('aria-pressed', 'true');
  panel = await openPanel(page, 'Map', 'Layers');
  const levels = panel.getByRole('group', {name: 'Portal level filters'});
  await expect(levels.getByRole('checkbox')).toHaveCount(8);
  await levels.getByRole('checkbox', {name: 'Level 1 portals', exact: true}).uncheck();
  await expect(levels.getByRole('checkbox', {name: 'Level 1 portals', exact: true})).not.toBeChecked();
  await expect(panel.getByRole('checkbox', {name: 'Level labels', exact: true})).toBeHidden();
  await panel.locator('summary').filter({hasText: /^Detail overlays$/}).click();
  await panel.getByRole('checkbox', {name: 'Level labels', exact: true}).check();
  await expect(panel.getByRole('checkbox', {name: 'Level labels', exact: true})).toBeChecked();
  for (const viewport of [{width: 320, height: 780}, {width: 780, height: 280}]) {
    await page.setViewportSize(viewport);
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    panel = await openPanel(page, 'Agent', 'Passcode');
    await expect(panel.getByLabel('Passcode rewards')).toHaveCount(0);
    await expect(panel).toContainText('Enter a passcode');
    await panel.getByLabel('Passcode', {exact: true}).fill('not submitted');
    const redeem = panel.getByRole('button', {name: 'Redeem', exact: true});
    await redeem.scrollIntoViewIfNeeded();
    await expect(redeem).toBeInViewport();
    panel = await openPanel(page, 'Map', 'Layers');
  }
});

test('image preview traps focus, blocks the background and restores its trigger; copy feedback stays beside its action', async ({page}) => {
  const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>')}`;
  // Authoritative map refreshes and portal details must describe the same portal image.
  await page.route('**/portal-feature-map.json', route => route.fulfill({json: {result: {map: {core: {gameEntities: [
    ['alpha', 1, ['p', 'R', 52000000, 4000000, 1, 100, 8, image, 'Alpha', [], false, false, null, 1]],
  ]}}}}}));
  await setupPortalMap(page);
  await page.evaluate(image => {
    const original = window.__irisRpcHandlers.getPortalDetails;
    window.__irisRpcHandlers.getPortalDetails = async init => {
      const data = await (await original(init)).json();
      data.result[7] = image;
      return Response.json(data);
    };
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => {window.copiedText = text;}}});
  }, image);
  await selectPortal(page, 'alpha');
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Portal', exact: true}).click();
  const portal = page.getByRole('complementary', {name: 'Selected portal details'});
  const trigger = portal.getByRole('button', {name: 'Open portal image preview'});
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: 'Portal image preview'});
  const close = dialog.getByRole('button', {name: 'Close image preview'});
  const imageBody = dialog.getByRole('region', {name: 'Portal image and caption'});
  await expect(close).toBeFocused();
  await expect(page.locator('nav[aria-label="Panels"]')).toHaveAttribute('inert', '');
  await page.keyboard.press('m');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(imageBody).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(imageBody).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('nav[aria-label="Panels"]')).not.toHaveAttribute('inert');
  await trigger.click();
  await close.click();
  await expect(trigger).toBeFocused();
  await portal.getByRole('button', {name: 'Share', exact: true}).click();
  const title = portal.getByRole('button', {name: 'Copy title', exact: true});
  await title.click();
  await expect(title).toHaveText('Copied ✓');
  await expect(title.locator('..').getByRole('status')).toHaveText('portal title copied');
  expect(await page.evaluate(() => window.copiedText)).toBe('Alpha');
  await portal.getByRole('button', {name: 'Copy Intel link', exact: true}).click();
  await expect(portal.getByRole('button', {name: 'Copy Intel link', exact: true})).toHaveText('Copied ✓');
  await expect(title).toHaveText('Copy title');
});

test('freshness uses the existing region timestamp and profile prioritizes progress over invites', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-14T12:00:00Z')});
  await setupPortalMap(page);
  await page.evaluate(() => {
    Object.assign(window.__irisRpcHandlers, {
      getGameScore: () => Response.json({result: ['300', '100']}),
      getRegionScoreDetails: () => Response.json({result: {regionName: 'Cell', gameScore: ['30', '10'], scoreHistory: [], topAgents: []}}),
    });
  });
  let panel = await openPanel(page, 'Map', 'Regional scores');
  await expect(panel).toContainText('Region updated just now');
  const calls = await page.evaluate(() => window.__irisRpcCalls.filter(name => ['getGameScore', 'getRegionScoreDetails'].includes(name)).length);
  await page.clock.fastForward(120_000);
  await expect(panel).toContainText('Region updated 2 min ago');
  expect(await page.evaluate(() => window.__irisRpcCalls.filter(name => ['getGameScore', 'getRegionScoreDetails'].includes(name)).length)).toBe(calls);
  panel = await openPanel(page, 'Agent', 'Profile');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_AGENT_STATUS', agent: {status: 'ready', nickname: 'Tester', team: 'R',
    level: 8, ap: 2000000, energy: 8000, xmCapacity: 10000, xmPercent: 80, levelPercent: 50, apToNextLevel: 1000000, availableInvites: 12}}, '*'));
  await expect(panel).toContainText('1,000,000 AP to next level');
  await expect(panel.getByRole('progressbar', {name: 'XM capacity'})).toHaveAttribute('aria-valuenow', '80');
  await expect(panel.getByText('Available invites: 12')).toBeHidden();
  await panel.locator('summary').filter({hasText: /^More agent information$/}).click();
  await expect(panel.getByText('Available invites: 12')).toBeVisible();
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_AGENT_STATUS', agent: {
    status: 'ready', nickname: 'Partial stats', maxLevel: true,
  }}, '*'));
  await expect(panel).toContainText('Level progress unavailable.');
  await expect(panel).not.toContainText('Maximum level');
});
