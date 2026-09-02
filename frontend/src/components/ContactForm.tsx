'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { FORM_LEVEL_ERROR_KEY } from '@/lib/drupal/errors';
import { contactSchema, type ContactInput } from '@/lib/schemas/contact';

const INPUT_CLASS =
  'w-full rounded border border-black/20 bg-transparent px-3 py-2 ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] ' +
  'aria-[invalid=true]:border-red-600';

interface ContactFormProps {
  /**
   * Injected so the form can be rendered in Storybook and unit tests without a
   * server. In the app this is the `submitContact` Server Action.
   */
  action: (
    input: ContactInput,
  ) => Promise<
    { ok: true } | { ok: false; fieldErrors: Record<string, string> }
  >;
}

export function ContactForm({ action }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      company: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await action(values);

      if (result.ok) {
        reset();
        setSent(true);
        // Move focus to the confirmation so the outcome is announced instead of
        // silently replacing the form for keyboard and screen-reader users.
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }

      // Drupal rejected it. Spread its per-field messages back onto the form and
      // put anything form-level above the fields.
      let firstField: keyof ContactInput | null = null;
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        if (field === FORM_LEVEL_ERROR_KEY) {
          setFormError(message);
          continue;
        }
        setError(field as keyof ContactInput, { type: 'server', message });
        firstField ??= field as keyof ContactInput;
      }
      if (firstField) setFocus(firstField);
    });
  });

  if (sent) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded border border-green-300 bg-green-50 px-4 py-3 text-green-900"
      >
        <p className="font-medium">Thanks — your message is on its way.</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-2 text-sm underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError ? (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900"
        >
          {formError}
        </div>
      ) : null}

      <FormField label="Name" error={errors.name?.message} required>
        <input type="text" className={INPUT_CLASS} {...register('name')} />
      </FormField>

      <FormField label="Email" error={errors.email?.message} required>
        <input type="email" className={INPUT_CLASS} {...register('email')} />
      </FormField>

      <FormField label="Subject" error={errors.subject?.message} required>
        <input type="text" className={INPUT_CLASS} {...register('subject')} />
      </FormField>

      <FormField
        label="Message"
        error={errors.message?.message}
        hint="At least 10 characters."
        required
      >
        <textarea rows={6} className={INPUT_CLASS} {...register('message')} />
      </FormField>

      {/* Honeypot — hidden from humans, validated server-side. */}
      <div aria-hidden className="hidden">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('company')}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-[color:var(--color-accent)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
