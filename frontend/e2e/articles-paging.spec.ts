import { expect, test } from '@playwright/test';

// The mock backend (e2e/mock-drupal/fixtures.mjs) publishes 26 articles: a
// full 24-item first page plus 2 more, so these specs exercise a real second
// page instead of asserting against a pool too small to ever paginate.

test.describe('article listing: cursor-based "Load more" paging', () => {
  test('shows a "Load more" link on page 1 when more articles exist', async ({
    page,
  }) => {
    await page.goto('/articles');

    const loadMore = page.getByRole('link', { name: 'Load more' });
    await expect(loadMore).toBeVisible();
    // A real href, not a JS-only click handler: this is what lets the
    // control degrade to a plain link when JavaScript is off.
    await expect(loadMore).toHaveAttribute('href', '/articles?page=2');
  });

  test('following "Load more" shows everything seen so far plus the next batch', async ({
    page,
  }) => {
    await page.goto('/articles');
    await page.getByRole('link', { name: 'Load more' }).click();

    await expect(page).toHaveURL('/articles?page=2');
    await expect(page.getByRole('listitem')).toHaveCount(26);
    // The first page's articles are still on screen: this is "load more",
    // not "replace with the next page".
    await expect(
      page.getByRole('heading', { name: 'Decoupling Drupal' }),
    ).toBeVisible();
    // All 26 published articles are now showing, so there is no further page.
    await expect(page.getByRole('link', { name: 'Load more' })).toHaveCount(0);
  });

  test('works with JavaScript disabled: the control is a plain link', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/articles');
    await page.getByRole('link', { name: 'Load more' }).click();

    await expect(page).toHaveURL('/articles?page=2');
    await expect(page.getByRole('listitem')).toHaveCount(26);

    await context.close();
  });

  test('requesting a page past the last one does not error', async ({
    page,
  }) => {
    const response = await page.goto('/articles?page=99');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('listitem')).toHaveCount(26);
    await expect(page.getByRole('link', { name: 'Load more' })).toHaveCount(0);
  });
});
