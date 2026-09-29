import { expect, test } from '@playwright/test';

test.describe('article listing: GraphQL Compose transport', () => {
  test('lists the same first-page articles as the JSON:API version', async ({
    page,
  }) => {
    await page.goto('/articles/graphql');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Articles' }),
    ).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(24);
    await expect(
      page.getByRole('heading', { name: 'Decoupling Drupal' }),
    ).toBeVisible();
  });

  test('renders the side-loaded image with its canonicalised URL', async ({
    page,
  }) => {
    await page.goto('/articles/graphql');

    const image = page.getByRole('img').first();
    await expect(image).toHaveAttribute('src', /hero\.jpg/);
  });

  test('links back to the JSON:API version for comparison', async ({
    page,
  }) => {
    await page.goto('/articles/graphql');

    await page.getByRole('link', { name: /JSON:API version/i }).click();
    await expect(page).toHaveURL('/articles');
  });

  test('the JSON:API listing links to the GraphQL version', async ({
    page,
  }) => {
    await page.goto('/articles');

    await page.getByRole('link', { name: /GraphQL Compose/i }).click();
    await expect(page).toHaveURL('/articles/graphql');
  });
});
