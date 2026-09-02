'use client';

import { useId, type ReactElement, cloneElement } from 'react';

interface FormFieldProps {
  label: string;
  /** The control. Receives id / aria-invalid / aria-describedby by cloning. */
  children: ReactElement<Record<string, unknown>>;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
}

/**
 * Label + control + error, wired for screen readers.
 *
 * The control gets `aria-invalid` and an `aria-describedby` pointing at the
 * hint and/or the error, and the error itself is a live region — so a user who
 * cannot see the red text still hears why the field was rejected. The wiring
 * lives here rather than at every call site so it cannot be forgotten.
 */
export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-[color:var(--color-accent)]">
            *
          </span>
        ) : null}
      </label>

      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}

      {hint ? (
        <p id={hintId} className="text-xs text-[color:var(--color-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
