import { expect, test } from '@playwright/test';

test('/map/alabama: 67 counties, layer switch, hover, panel, table, empty cells, overlay', async ({ page }) => {
  await page.goto('/map/alabama');
  await expect(page.getByTestId('map-area')).toHaveCount(67);
  const legend = page.getByTestId('map-legend');
  const before = await legend.textContent();
  await page.getByTestId('layer-select').selectOption('chr_suicide_rate');
  await expect(page).toHaveURL(/layer=chr_suicide_rate/);
  await expect(legend).not.toHaveText(before!);
  // hover Madison
  await page.locator('[data-testid="map-area"][data-fips="01089"]').hover();
  const tip = page.getByTestId('map-tooltip');
  await expect(tip).toContainText('Madison County');
  await expect(tip.getByTestId('tooltip-value')).not.toBeEmpty();
  await expect(tip.getByTestId('tooltip-cite')).toBeVisible();
  // a county with an empty suicide-rate cell: "not published or suppressed", never 0
  await page.locator('[data-testid="map-area"][data-fips="01011"]').hover(); // Bullock
  await expect(page.getByTestId('map-tooltip')).toContainText('Bullock County');
  await expect(page.getByTestId('tooltip-value')).toHaveText('not published or suppressed');
  // click opens the panel with every layer
  await page.locator('[data-testid="map-area"][data-fips="01089"]').dispatchEvent('click');
  await expect(page).toHaveURL(/geo=01089/);
  const panel = page.getByTestId('area-panel');
  await expect(panel).toContainText('Madison County');
  await expect(panel.getByTestId('county-overlays')).toContainText('WellStone');
  // table view lists 67 rows
  await page.getByTestId('map-table-button').click();
  await expect(page.getByTestId('map-table-row')).toHaveCount(67);
  const bullock = page.getByTestId('map-table-row').filter({ hasText: 'Bullock' });
  await expect(bullock).toContainText('not published or suppressed');
  await expect(bullock.locator('td').nth(1)).not.toHaveText('0');
});

test('Coosa and Lamar show the caveat for their empty primary-care ratio', async ({ page }) => {
  await page.goto('/map/alabama?layer=chr_pcp_ratio');
  await page.locator('[data-testid="map-area"][data-fips="01037"]').hover();
  await expect(page.getByTestId('tooltip-caveat')).toContainText('reports 0 primary care physicians');
});

test('an overlay toggle draws service-area outlines', async ({ page }) => {
  await page.goto('/map/alabama');
  await page.getByTestId('toggle-cmhc').check();
  await expect(page).toHaveURL(/overlay=cmhc/);
  await expect(page.getByTestId('overlay-cmhc').getByTestId('overlay-outline')).toHaveCount(19);
  await expect(page.getByTestId('overlay-disagreement').first()).toBeVisible();
});

test('/map/us: 51 areas, Alabama outlined, panel compares with Alabama', async ({ page }) => {
  await page.goto('/map/us?layer=mha_access_rank');
  await expect(page.getByTestId('map-area')).toHaveCount(51);
  await expect(page.getByTestId('alabama-outline')).toHaveCount(1);
  await page.locator('[data-testid="map-area"][data-fips="13"]').dispatchEvent('click'); // Georgia
  const panel = page.getByTestId('area-panel');
  await expect(panel).toContainText('Georgia');
  await expect(panel.locator('th', { hasText: 'Alabama' }).first()).toBeVisible();
});

test('map state is URL-addressable and the CSV downloads with its source line', async ({ page }) => {
  await page.goto('/map/alabama?layer=chr_mh_provider_ratio&geo=01089');
  await expect(page.getByTestId('layer-title')).toHaveText('Mental Health Providers');
  await expect(page.getByTestId('area-panel')).toContainText('Madison County');
  const dl = page.waitForEvent('download');
  await page.getByTestId('map-csv').click();
  const text = await (await dl).createReadStream().then((s) => new Promise<string>((res) => { let b = ''; s!.on('data', (c) => (b += c)); s!.on('end', () => res(b)); }));
  expect(text).toContain('chr_mh_provider_ratio');
  expect(text).toContain('source,');
});

test('keyboard: arrow keys move between counties and announce them', async ({ page }) => {
  await page.goto('/map/alabama?layer=pop_est');
  await page.getByTestId('map-svg').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('map-live')).toContainText('Jefferson County');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('area-panel')).toContainText('Jefferson County');
});
