import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('/changes defaults to substantive, filters by section, downloads CSV', async ({ page }) => {
  await page.goto('/changes');
  await expect(page.getByTestId('changes-counts')).toContainText('744');
  await expect(page.getByTestId('filter-weight')).toHaveValue('substantive');
  await expect(page.getByTestId('changes-shown')).toHaveText('206 shown');
  const cards = page.getByTestId('change-card');
  await expect(cards.first()).toContainText('substantive');
  await page.getByTestId('filter-section').selectOption('d3');
  await expect(page).toHaveURL(/section=d3/);
  const n = Number((await page.getByTestId('changes-shown').textContent())!.split(' ')[0]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(206);
  const dl = page.waitForEvent('download');
  await page.getByTestId('download-csv').click();
  const csv = fs.readFileSync((await (await dl).path())!, 'utf8');
  expect(csv.split('\r\n')[0]).toContain('id,block,section,type,weight');
  expect(csv.trim().split('\r\n').length).toBe(n + 1);
});

test('/open-items pins the two browser tasks and filters by who', async ({ page }) => {
  await page.goto('/open-items');
  await expect(page.getByRole('heading', { name: 'Two things a person with a browser can settle in ten minutes' })).toBeVisible();
  const all = await page.getByTestId('open-item').count();
  expect(all).toBe(95);
  await page.getByTestId('filter-who').selectOption('author');
  await expect(page).toHaveURL(/who=author/);
  const n = await page.getByTestId('open-item').count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(95);
  for (const t of await page.getByTestId('open-item').allTextContents()) expect(t).toContain('who can close it: the author');
});
