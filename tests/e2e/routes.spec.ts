import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/read', '/systems', '/map/alabama', '/map/us', '/map/sources', '/changes', '/open-items', '/references', '/glossary', '/concepts', '/concepts/crisis-system', '/figures', '/figures/fig-beds', '/figures/fig-systems-graph', '/methods', '/about', '/notes', '/search?q=988', '/no-such-page'];

for (const r of ROUTES) {
  test(`${r} renders its h1 and the draft banner`, async ({ page }) => {
    const res = await page.goto(r);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    const banner = page.getByTestId('draft-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Draft for review');
    await expect(banner.getByRole('link', { name: 'What changed' })).toHaveAttribute('href', /\/changes$/);
    await expect(banner.getByRole('link', { name: 'Open items' })).toHaveAttribute('href', /\/open-items$/);
  });
}

test('as_of appears on /, /read, /about, both maps and /systems', async ({ page }) => {
  for (const r of ['/', '/read', '/about', '/map/alabama', '/map/us', '/systems']) {
    await page.goto(r);
    await expect(page.getByText(/3 October 2026/).first()).toBeVisible();
  }
});

test('the venue is on / and /about', async ({ page }) => {
  for (const r of ['/', '/about']) {
    await page.goto(r);
    await expect(page.getByTestId('venue')).toContainText('not peer reviewed');
  }
});

test('dark mode persists across a reload and the logo sits on a white panel', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const bg = await page.getByTestId('logo-panel').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');
});

for (const r of ['/read', '/map/alabama', '/systems', '/changes']) {
  test(`${r} works at 375 px without horizontal page scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(r);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}
