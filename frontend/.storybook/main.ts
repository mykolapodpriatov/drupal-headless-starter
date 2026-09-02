import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook is the component workbench *and* the published component
// documentation for this starter — the GitHub Pages demo serves the built
// output at /storybook. Stories render against the same domain-model fixtures
// the unit tests use, so a story can never drift from a shape the app can
// actually produce.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  // GitHub Pages serves the build under /<repo>/, so assets need that prefix.
  // Locally STORYBOOK_BASE_PATH is unset and the default '/' applies.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    base: process.env.STORYBOOK_BASE_PATH ?? '/',
  }),
};

export default config;
