import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

test.beforeEach(installPortalFixture);

async function openPanel(page, menu, name) {
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: menu, exact: true});
  if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
  const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name, exact: true});
  if (await secondary.getAttribute('aria-pressed') !== 'true') await secondary.click();
  return page.locator('aside:visible');
}

async function oneScroller(panel) {
  expect(await panel.evaluate(element => [element, ...element.querySelectorAll('*')].filter(node =>
    ['auto', 'scroll'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 2
  ).length)).toBe(1);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
}

for (const layout of [
  {width: 320, height: 780, theme: 'dark', touch: true},
  {width: 412, height: 780, theme: 'light', touch: true},
  {width: 780, height: 280, theme: 'light', touch: false},
]) test.describe(`${layout.width}px ${layout.theme} panel priorities`, () => {
  test.use({viewport: {width: layout.width, height: layout.height}, hasTouch: layout.touch});
  test('mission source and selected keys stay clear while long content uses one scroller', async ({page}, testInfo) => {
    await page.route('https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/**', route => route.fulfill({status: 200, body: ''}));
    await setupPortalMap(page, layout.theme);
    await selectPortal(page, 'alpha');
    await page.evaluate(() => {
      window.priorityFixture = {sources: [], inventoryRequests: 0};
      const missions = source => {
        window.priorityFixture.sources.push(source);
        return Response.json({result: Array.from({length: 16}, (_, i) => [
          `${source}-${i}`, i === 0 ? 'A long mission title that remains readable on a narrow screen' : `Mission ${i}`,
        ])});
      };
      Object.assign(window.__irisRpcHandlers, {
        getTopMissionsInBounds: () => missions('view'),
        getTopMissionsForPortal: () => missions('portal'),
        getMissionDetails: init => Response.json({result: [JSON.parse(init.body).guid,
          'A long mission title that remains readable on a narrow screen', 'Mission description', 'Agent', 'RESISTANCE',
          900000, 60000, 1, 1, [[false, 'alpha', 'Start', 1, 1, ['p', 'Start', 52000000, 4000000]]]]}),
        getHasActiveSubscription: () => Response.json({result: true}),
        getInventory: () => {
          window.priorityFixture.inventoryRequests += 1;
          return Response.json({result: Array.from({length: 24}, (_, i) => [`key-${i}`, 1, {
            resource: {resourceType: 'PORTAL_LINK_KEY'},
            portalCoupler: {portalGuid: i === 0 ? 'beta' : `key-portal-${i}`,
              portalTitle: i === 0 ? 'A long portal key name that should wrap on narrow screens' : `Key ${i}`},
          }])});
        },
      });
    });
    let panel = await openPanel(page, 'Map', 'Missions');
    const source = panel.getByRole('group', {name: 'Mission source'});
    await expect(panel.getByLabel('Mission summary')).toContainText('16 view missions');
    await expect(source.getByRole('button', {name: 'View', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('.iitc-iris-mission-metrics')).toHaveCount(0);
    await expect(panel.getByRole('link', {name: 'Create mission', exact: true})).toBeHidden();
    await oneScroller(panel);
    const last = panel.getByRole('button', {name: /^Mission 15(?: |$)/});
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await source.getByRole('button', {name: 'Portal', exact: true}).click();
    await expect(panel.getByLabel('Mission summary')).toContainText('16 portal missions');
    await expect(source.getByRole('button', {name: 'Portal', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await panel.getByRole('button', {name: /A long mission title/}).click();
    await expect(panel.locator('.iitc-iris-mission-metrics')).toContainText('waypoints');
    await oneScroller(panel);
    expect(await page.evaluate(() => window.priorityFixture.sources)).toEqual(['view', 'portal']);
    await panel.locator('.iitc-iris-mission-more > summary').click();
    await expect(panel.getByRole('link', {name: 'Create mission', exact: true})).toBeVisible();

    panel = await openPanel(page, 'Agent', 'Inventory');
    await expect(panel.getByLabel('Inventory totals')).toContainText('24');
    const selected = panel.getByLabel('Selected portal keys');
    await expect(selected).toContainText('Alpha');
    await expect(selected).toContainText('0 selected keys');
    await expect(selected.getByText('0 loose · 0 in capsules')).toBeHidden();
    await selected.locator('summary').click();
    await expect(selected.getByText('0 loose · 0 in capsules')).toBeVisible();
    await oneScroller(panel);
    const lastKey = panel.locator('.iitc-iris-inventory-key-row').last();
    await lastKey.scrollIntoViewIfNeeded();
    await expect(lastKey).toBeInViewport();
    await selectPortal(page, 'beta');
    await expect(selected).toContainText('Beta');
    await expect(selected).toContainText('1 selected keys');
    expect(await page.evaluate(() => window.priorityFixture.inventoryRequests)).toBe(1);
    await panel.locator('.iitc-iris-request-panel-body').evaluate(element => {element.scrollTop = 0;});
    await testInfo.attach('inventory-priorities', {body: await page.screenshot(), contentType: 'image/png'});
  });
});
