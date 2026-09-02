import { expect, test } from '@playwright/test';

const SECRET = 'e2e-preview-secret';

test.describe('preview mode', () => {
  test('rejects a request without the shared secret', async ({ request }) => {
    const response = await request.get(
      '/api/preview?slug=/articles/pricing-changes',
    );

    expect(response.status()).toBe(401);
  });

  test('rejects an off-site redirect target', async ({ request }) => {
    const response = await request.get(
      `/api/preview?secret=${SECRET}&slug=https://evil.example.com`,
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(400);
  });

  test('reveals the unpublished working copy and marks it as a preview', async ({
    page,
  }) => {
    await page.goto(
      `/api/preview?secret=${SECRET}&slug=/articles/pricing-changes`,
    );

    await expect(page).toHaveURL('/articles/pricing-changes');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Unpublished pricing changes',
      }),
    ).toBeVisible();
    await expect(page.getByText(/Preview mode/)).toBeVisible();
    await expect(
      page.getByText('This paragraph exists only in the working copy.'),
    ).toBeVisible();
  });

  test('exiting preview hides the draft again', async ({ page }) => {
    await page.goto(
      `/api/preview?secret=${SECRET}&slug=/articles/pricing-changes`,
    );
    await expect(page.getByText(/Preview mode/)).toBeVisible();

    await page.goto('/api/preview/exit');
    const response = await page.goto('/articles/pricing-changes');

    expect(response?.status()).toBe(404);
  });
});
