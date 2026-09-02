import type { Metadata } from 'next';

import { ContactForm } from '@/components/ContactForm';
import { submitContact } from '@/app/contact/actions';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Send a message. Demonstrates react-hook-form + zod validation with Drupal-side errors mapped back onto the form.',
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
        <p className="text-[color:var(--color-muted)]">
          Validated on the client with zod, re-validated in the Server Action,
          and any constraint Drupal rejects comes back attached to the field
          that caused it.
        </p>
      </header>

      <ContactForm action={submitContact} />
    </main>
  );
}
