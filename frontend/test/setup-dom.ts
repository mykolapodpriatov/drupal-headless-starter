// Shared setup for the `dom` Vitest project.
//
// - jest-dom matchers (toBeInTheDocument, toHaveAttribute, …)
// - unmount every render between tests so queries never see a stale tree
// - next/image is a server-aware component that pulls in the Next image loader;
//   under jsdom we only care about the rendered <img>, so swap it for a plain
//   one. Keeping this here means component code stays free of test-only shims.

import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    sizes,
    ...rest
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    [key: string]: unknown;
  }) =>
    React.createElement('img', {
      src,
      alt,
      ...(sizes !== undefined ? { sizes } : {}),
      ...rest,
    }),
}));

afterEach(() => {
  cleanup();
});
