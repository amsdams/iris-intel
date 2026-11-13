import {test, expect} from './smoke-fixtures.mjs';

test.use({locale: 'en-US', timezoneId: 'UTC'});

async function openScores(page, theme = 'dark') {
  await page.addInitScript(theme => {
    localStorage.setItem('iitc-iris:ui-theme', theme);
    window.__irisRpcHandlers = {
      // This suite leaves the map in live mode, including its background artifact refresh.
      getArtifactPortals: () => Response.json({result: {}}),
      getGameScore: () => Response.json({result: ['400', '800']}),
      getRegionScoreDetails: () => Response.json({result: {
        regionName: 'Fixture Cell', gameScore: ['100', '200'],
        scoreHistory: [['1', '100', '200'], ['2', '200', '400'], ['3', '0', '0']],
        topAgents: Array.from({length: 12}, (_, i) => ({nick: `Agent ${i + 1}`, team: i % 2 ? 'ENLIGHTENED' : 'RESISTANCE'})),
      }}),
    };
  }, theme);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__iitcIrisMap))).toBe(true);
  const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
  const mapTab = primary.getByRole('button', {name: 'Map', exact: true});
  if (await mapTab.getAttribute('aria-pressed') !== 'true') await mapTab.click();
  await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Scores', exact: true}).click();
}

test('cancelled score refreshes recover on reopen and fixtures survive a full reload', async ({page}) => {
  await openScores(page);
  const scoreboard = page.getByRole('region', {name: 'Regional scoreboard'});
  const panel = scoreboard.locator('..');
  await expect(scoreboard).toBeVisible();
  await page.evaluate(() => {
    window.scoreReview = {original: {}, pending: []};
    for (const endpoint of ['getGameScore', 'getRegionScoreDetails']) {
      const original = window.__irisRpcHandlers[endpoint];
      window.scoreReview.original[endpoint] = original;
      window.__irisRpcHandlers[endpoint] = init => new Promise(resolve => {
        window.scoreReview.pending.push({signal: init.signal, finish: () => resolve(original(init))});
      });
    }
  });
  await panel.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.scoreReview.pending.length)).toBe(2);
  const scoresButton = page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: 'Scores', exact: true});
  await scoresButton.click();
  await expect(scoreboard).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scoreReview.pending.every(request => request.signal.aborted))).toBe(true);
  await scoresButton.click();
  await expect(scoreboard).toBeVisible();
  await expect(panel.getByRole('button', {name: 'Refresh', exact: true})).toBeEnabled();
  await page.evaluate(() => {
    Object.assign(window.__irisRpcHandlers, window.scoreReview.original);
    window.scoreReview.pending.forEach(request => request.finish());
  });
  await expect(panel.getByRole('button', {name: 'Refresh', exact: true})).toBeEnabled();
  await page.reload();
  await expect(scoreboard).toBeVisible();
  await expect(page.getByText('Fixture Cell', {exact: true})).toBeVisible();
  await expect(scoreboard.locator('tbody tr')).toHaveCount(3);
  await panel.locator('summary').filter({hasText: /^Top agents/}).click();
  await expect(panel.getByText('Agent 12', {exact: true})).toBeVisible();
});

for (const theme of ['light', 'dark']) for (const width of [320, 1200]) {
  test(`regional history, chart, projections and all agents (${theme}, ${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 780});
    await openScores(page, theme);
    const scores = page.getByRole('region', {name: 'Regional scoreboard'});
    const panel = scores.locator('..');
    await expect(scores).toBeVisible();
    await expect(panel.locator('summary')).toHaveText(['Top agents (12)', 'Checkpoint history', 'Cycle projection']);
    await expect(panel.locator('summary.iitc-iris-section-summary')).toHaveCount(3);
    await expect(panel.getByText('Agent 1', {exact: true})).toHaveCount(1);
    await expect(panel.getByText('Agent 1', {exact: true})).toBeHidden();
    await expect(page.getByText('Fixture Cell', {exact: true})).toBeVisible();
    await expect(scores.getByRole('img', {name: 'Regional checkpoint MU history'})).toBeVisible();
    const typography = await panel.evaluate(element => {
      const style = selector => getComputedStyle(element.querySelector(selector));
      return {
        body: getComputedStyle(element).fontSize,
        heading: style('.iitc-iris-score-heading').fontSize,
        caption: style('.iitc-iris-status').fontSize,
        table: style('.iitc-iris-region-table').fontSize,
        chart: style('.iitc-iris-region-chart text').fontSize,
        chartUsesUiFont: style('.iitc-iris-region-chart text').fontFamily === getComputedStyle(element).fontFamily,
      };
    });
    expect(typography).toEqual({body: '11px', heading: '12px', caption: '10px',
      table: width <= 760 ? '10px' : '11px', chart: '11px', chartUsesUiFont: true});
    await expect(scores.locator('tbody tr')).toHaveCount(3);
    const line = scores.locator('polyline').first();
    const linear = await line.getAttribute('points');
    await scores.getByRole('checkbox', {name: 'Logarithmic scale'}).check();
    expect(await line.getAttribute('points')).not.toBe(linear);
    await scores.locator('summary').filter({hasText: /^Cycle projection$/}).click();
    await expect(scores).toContainText('Estimated final average: RES 200 MU · ENL 100 MU');
    const agents = panel.locator('summary').filter({hasText: /^Top agents/});
    await agents.focus();
    await page.keyboard.press('Enter');
    await expect(panel.getByText('Agent 12', {exact: true})).toBeVisible();
    await expect(panel.locator('ol > li')).toHaveCount(12);
    await expect(scores.getByRole('img', {name: 'Regional checkpoint MU history'})).toBeVisible();
    await expect(scores).toContainText('Estimated final average: RES 200 MU · ENL 100 MU');
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}
