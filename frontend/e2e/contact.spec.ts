import { expect, test } from '@playwright/test';

const VALID = {
  name: 'Ada Lovelace',
  subject: 'About the analytical engine',
  message: 'I have some notes on the Bernoulli numbers routine.',
};

async function fill(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Name').fill(VALID.name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Subject').fill(VALID.subject);
  await page.getByLabel('Message').fill(VALID.message);
}

test.describe('contact form', () => {
  test('rejects an empty submission on the client', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Asserted by message rather than by counting role=alert: Next injects its
    // own empty route announcer with role=alert, so a count would be testing
    // the framework's internals as much as the form.
    for (const message of [
      'Tell us your name.',
      'We need an email address to reply to.',
      'Add a subject.',
      'Please write at least 10 characters.',
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }

    // Nothing was sent: a success confirmation would mean the guard failed.
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('submits successfully and confirms', async ({ page }) => {
    await page.goto('/contact');
    await fill(page, 'ada@example.com');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('status')).toContainText('on its way');
  });

  test('surfaces a Drupal 422 on the field that caused it', async ({ page }) => {
    await page.goto('/contact');
    // The mock rejects this address with two errors: one on field_email, one on
    // field_internal_note — a field this form does not expose.
    await fill(page, 'taken@example.com');
    await page.getByRole('button', { name: 'Send message' }).click();

    const emailError = page.getByText('This address is already subscribed.');
    await expect(emailError).toBeVisible();

    // The field-level message is wired to the input for assistive technology.
    const describedBy = await page.getByLabel('Email').getAttribute('aria-describedby');
    expect(describedBy).toContain(await emailError.getAttribute('id') ?? '');

    // The unmapped Drupal field became a form-level message, not a phantom input.
    await expect(page.getByText(/rejected for taken@example\.com/)).toBeVisible();
    await expect(page.getByLabel('Internal note')).toHaveCount(0);
  });

  test('keeps the form usable after a server rejection', async ({ page }) => {
    await page.goto('/contact');
    await fill(page, 'taken@example.com');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('This address is already subscribed.')).toBeVisible();

    // Correcting the address and resubmitting must succeed.
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('status')).toContainText('on its way');
  });
});
