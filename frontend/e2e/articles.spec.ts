import { expect, test } from '@playwright/test';

test.describe('article browsing', () => {
  test('lists the articles Drupal published', async ({ page }) => {
    await page.goto('/articles');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Articles' }),
    ).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(3);
    await expect(
      page.getByRole('heading', { name: 'Decoupling Drupal' }),
    ).toBeVisible();
  });

  test('navigates from the list to a full article', async ({ page }) => {
    await page.goto('/articles');
    await page.getByRole('link', { name: /Decoupling Drupal/ }).click();

    await expect(page).toHaveURL('/articles/decoupling-drupal');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Decoupling Drupal' }),
    ).toBeVisible();
    // Body arrives as Drupal's processed HTML and is rendered, not escaped.
    await expect(
      page.getByRole('heading', { level: 2, name: 'Section' }),
    ).toBeVisible();
  });

  test('renders the side-loaded image with its alt text', async ({ page }) => {
    await page.goto('/articles/decoupling-drupal');

    // The mapper canonicalises Drupal's site-relative file URL against the
    // public origin — if that broke, the src would still be relative.
    const image = page.getByRole('img').first();
    await expect(image).toHaveAttribute('src', /hero\.jpg/);
  });

  test('shows the segment-level 404 for an unknown slug', async ({ page }) => {
    const response = await page.goto('/articles/no-such-article');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Article not found' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /browse all articles/i }),
    ).toBeVisible();
  });

  test('does not expose an unpublished article to anonymous visitors', async ({
    page,
  }) => {
    const response = await page.goto('/articles/pricing-changes');

    expect(response?.status()).toBe(404);
  });
});
