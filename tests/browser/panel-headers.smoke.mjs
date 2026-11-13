import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

const layouts = [
  {width: 320, height: 780, theme: 'dark', touch: true},
  {width: 412, height: 780, theme: 'light', touch: true},
  {width: 1200, height: 800, theme: 'dark', touch: false},
  {width: 780, height: 280, theme: 'light', touch: false},
];

async function aligned(header, titleSelector) {
  const geometry = await header.evaluate((element, selector) => {
    const bounds = node => {
      const rect = node.getBoundingClientRect();
      return {center: rect.y + rect.height / 2, left: rect.x, right: rect.right, width: rect.width};
    };
    const title = bounds(element.querySelector(selector));
    const actions = bounds(element.querySelector(':scope > .iitc-iris-panel-header-actions'));
    const buttons = [...element.querySelectorAll('.iitc-iris-panel-header-actions button')].map(bounds);
    const panel = element.closest('aside');
    const style = getComputedStyle(panel);
    const contentLeft = panel.getBoundingClientRect().left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    return {title, actions, buttons, fits: element.scrollWidth <= element.clientWidth,
      contentLeft, leadingLeft: element.firstElementChild.getBoundingClientRect().left,
      headerLeft: element.getBoundingClientRect().left};
  }, titleSelector);
  expect(Math.abs(geometry.title.center - geometry.actions.center)).toBeLessThanOrEqual(1);
  for (const button of geometry.buttons) expect(Math.abs(button.center - geometry.actions.center)).toBeLessThanOrEqual(1);
  expect(geometry.title.width).toBeGreaterThan(0);
  expect(geometry.title.right).toBeLessThanOrEqual(geometry.actions.left);
  expect(geometry.fits).toBe(true);
  expect(Math.abs(geometry.leadingLeft - geometry.contentLeft)).toBeLessThanOrEqual(1);
  expect(geometry.contentLeft - geometry.headerLeft).toBeCloseTo(6, 0);
}

for (const layout of layouts) test.describe(`${layout.width}px ${layout.theme} headers`, () => {
  test.use({hasTouch: layout.touch, viewport: {width: layout.width, height: layout.height}});
  test.beforeEach(installPortalFixture);

  test('titles and controls share a vertical center, including wrapped portal names', async ({page}) => {
    await setupPortalMap(page, layout.theme);
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
    const secondary = page.locator('.iitc-iris-sheet-tabbar-secondary');
    for (const [menu, name] of [
      ['Map', 'Layers'], ['Map', 'Controls'], ['Map', 'Search'], ['Agent', 'Profile'],
      ['COMM', null], ['System', 'Appearance'], ['System', 'Diagnostics'], ['System', 'About'],
    ]) {
      const main = primary.getByRole('button', {name: menu, exact: true});
      if (await main.getAttribute('aria-pressed') !== 'true') await main.click();
      if (name) {
        const tab = secondary.getByRole('button', {name, exact: true});
        if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click();
      }
      const panel = page.locator('aside:visible');
      await expect(panel).toBeVisible();
      await aligned(panel.locator('.iitc-iris-request-panel-header'), ':scope > .iitc-iris-selected-title');
      if (menu === 'COMM') {
        const body = panel.locator('.iitc-iris-comm-body');
        const loaded = body.locator('.iitc-iris-comm-summary');
        const technical = body.locator('.iitc-iris-technical-details');
        expect(await body.evaluate(element => element.lastElementChild.classList.contains('iitc-iris-panel-footer'))).toBe(true);
        expect((await loaded.boundingBox()).y).toBeLessThan((await technical.boundingBox()).y);
        expect(await loaded.evaluate(element => Boolean(element.compareDocumentPosition(
          element.parentElement.querySelector('.iitc-iris-technical-details')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      }
      if (name === 'Layers') await page.screenshot({path: `/private/tmp/iris-header-layers-${layout.width}.png`});
    }
    await selectPortal(page, 'alpha');
    const portalTab = primary.getByRole('button', {name: 'Portal', exact: true});
    if (await portalTab.getAttribute('aria-pressed') !== 'true') await portalTab.click();
    const portal = page.getByRole('complementary', {name: 'Selected portal details'});
    await aligned(portal.locator('.iitc-iris-portal-side-header'), '.iitc-iris-portal-side-title');
    await expect(portal.locator('.iitc-iris-portal-header-owner')).toHaveText('OwnerOther');
    await expect(portal.locator('.iitc-iris-portal-facts')).toContainText('Other');
    await page.evaluate(() => {
      const original = window.__irisRpcHandlers.getPortalDetails;
      window.__irisRpcHandlers.getPortalDetails = async init => {
        const body = await (await original(init)).json();
        body.result[8] = 'A long portal title that wraps across several lines on a small screen';
        body.result[16] = 'LongPortalOwnerNickname';
        return Response.json(body);
      };
    });
    await selectPortal(page, 'beta');
    await expect(portal.locator('.iitc-iris-selected-title')).toHaveText('A long portal title that wraps across several lines on a small screen');
    await expect(portal.locator('.iitc-iris-portal-header-owner')).toHaveText('OwnerLongPortalOwnerNickname');
    await aligned(portal.locator('.iitc-iris-portal-side-header'), '.iitc-iris-portal-side-title');
    await page.screenshot({path: `/private/tmp/iris-header-portal-${layout.width}.png`});
  });
});
