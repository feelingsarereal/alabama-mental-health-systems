import { expect, test } from '@playwright/test';

test('⌘K finds a county, a term and a block', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  const input = page.getByTestId('palette-input');
  await expect(input).toBeFocused();
  for (const [q, label] of [['Madison', 'Counties'], ['Hunter consent decree', 'Glossary'], ['771', 'In the report']] as const) {
    await input.fill(q);
    await expect(page.getByTestId('search-modal').getByRole('heading', { name: label })).toBeVisible();
  }
  await input.fill('Madison');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/map\/alabama\?layer=pop_est&geo=01089/);
});

test('/search?q=waitlist shows grouped results', async ({ page }) => {
  await page.goto('/search?q=waitlist');
  const res = page.getByTestId('search-results');
  await expect(res.getByRole('heading', { name: /In the report/ })).toBeVisible();
  expect(await res.getByRole('heading').count()).toBeGreaterThan(1);
  await expect(page.getByTestId('search-result').first().locator('mark').first()).toBeVisible();
});
