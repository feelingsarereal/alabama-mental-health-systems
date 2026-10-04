import { expect, test } from '@playwright/test';

test('/systems renders 12 nodes and the pack\'s edges; an edge shows evidence with a working citation', async ({ page }) => {
  await page.goto('/systems');
  await expect(page.getByTestId('graph-node')).toHaveCount(12);
  await expect(page.getByTestId('graph-edge')).toHaveCount(16); // KICKOFF says 17; the pack draws 16 — see the scrum note
  await page.locator('[data-edge="e1-d6-d2"]').click();
  await expect(page).toHaveURL(/edge=e1-d6-d2/);
  const panel = page.getByTestId('edge-panel');
  await expect(panel).toContainText('Evidence justifies or withholds funds');
  const cite = panel.getByTestId('edge-evidence').locator('[data-cite]').first();
  await cite.hover();
  await expect(page.getByTestId('cite-popover')).toBeVisible();
  await expect(page.getByTestId('cite-popover').getByTestId('ref-summary')).not.toBeEmpty();
});

test('selecting a node shows its panel; "Depends on" follows the report\'s links; the table view is one click away', async ({ page }) => {
  await page.goto('/systems?node=d3');
  await expect(page.getByTestId('node-panel')).toContainText('Domain 3');
  await page.getByRole('button', { name: 'Depends on' }).click();
  await expect(page.getByText("following the report's thirteen links")).toBeVisible();
  await page.getByTestId('table-view').click();
  await expect(page.getByTestId('systems-table').locator('tbody tr')).toHaveCount(16);
});

test('the table view is the default below 768 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/systems');
  await expect(page.getByTestId('systems-table')).toBeVisible();
});
