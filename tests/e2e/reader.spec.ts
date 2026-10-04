import { expect, test } from '@playwright/test';

async function firstCiteInDomain3(page: import('@playwright/test').Page) {
  await page.goto('/read#d3');
  await expect(page.getByTestId('reader-body')).toBeVisible();
  // the first citation in Domain 3: the first [n] after the Domain 3 heading
  const handle = await page.evaluateHandle(() => {
    const h = document.getElementById('d3')!;
    return [...document.querySelectorAll<HTMLElement>('[data-cite]')].find((c) => h.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)!;
  });
  return page.locator(`#${await handle.evaluate((el) => el.closest('[data-block]')!.id)} [data-cite]`).first();
}

test('hovering the first [n] in Domain 3 shows the summary and what supports the sentence', async ({ page }) => {
  const cite = await firstCiteInDomain3(page);
  await page.waitForTimeout(400); // ledger and references load right after the text
  await cite.scrollIntoViewIfNeeded();
  await cite.hover();
  const pop = page.getByTestId('cite-popover');
  await expect(pop).toBeVisible();
  await expect(pop.getByTestId('ref-summary')).not.toBeEmpty();
  await expect(pop.getByText('What supports this sentence')).toBeVisible();
  await expect(pop.getByRole('link', { name: /Open the source/ })).toBeVisible();
  await expect(pop.getByRole('link', { name: /Full reference/ })).toBeVisible();
});

test('the same card opens by keyboard and closes with Esc, focus returning', async ({ page }) => {
  const cite = await firstCiteInDomain3(page);
  await page.waitForTimeout(400);
  await cite.focus();
  await expect(page.getByTestId('cite-popover')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cite-popover').getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cite-popover')).toBeHidden();
  await expect(cite).toBeFocused();
});

test('clicking [n] folds the card out under the paragraph', async ({ page }) => {
  const cite = await firstCiteInDomain3(page);
  await cite.click();
  await expect(page.getByTestId('foldout').first()).toBeVisible();
  await expect(page.getByTestId('foldout').first().getByTestId('ref-summary')).not.toBeEmpty();
});

test('"Show what was checked" underlines claims; a claim opens a card with a status and a source', async ({ page }) => {
  await page.goto('/read#d3');
  await page.getByTestId('show-checked').check();
  await expect(page.getByTestId('claim-legend')).toBeVisible();
  const claim = page.locator('.bx-checked [data-claim].g-verified').first();
  await claim.scrollIntoViewIfNeeded();
  await claim.hover();
  const card = page.getByTestId('claim-popover');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('claim-status')).toContainText(/Verified as written/);
  await expect(card.getByTestId('claim-source').first()).toBeVisible();
  // persisted
  await page.reload();
  await expect(page.getByTestId('show-checked')).toBeChecked();
});

test('a change marker opens a word diff with a reason', async ({ page }) => {
  await page.goto('/read#b-B0141');
  const marker = page.locator('#b-B0141').getByTestId('change-marker');
  await marker.click();
  const list = page.getByTestId('change-list').first();
  await expect(list).toBeVisible();
  await expect(list.getByTestId('diff').first()).toBeVisible();
  await expect(list.getByText('Why:').first()).toBeVisible();
});

test('/read#b-B0141 scrolls to the block', async ({ page }) => {
  await page.goto('/read#b-B0141');
  const b = page.locator('#b-B0141');
  await expect(b).toBeVisible();
  await expect(b).toBeInViewport();
});

test('analysis passages are marked and the read banner is shown', async ({ page }) => {
  await page.goto('/read');
  await expect(page.getByTestId('read-banner')).toContainText('Written by Little Orange Fish');
  await expect(page.getByTestId('analysis').first()).toContainText('analysis');
});
