// Automated accessibility assertions for component tests.
//
// The Storybook a11y panel is the interactive counterpart to this, but a panel
// nobody opens catches nothing — running axe inside the normal test suite means
// a regression fails CI. Scoped to serious/critical: axe's minor/moderate rules
// produce enough noise on partial DOM fragments to train people to ignore them.

import axe, { type AxeResults, type Result } from 'axe-core';
import { expect } from 'vitest';

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

function format(violations: Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `      ${n.html}`).join('\n');
      return `  [${v.impact}] ${v.id}: ${v.help}\n${nodes}\n      ${v.helpUrl}`;
    })
    .join('\n\n');
}

/**
 * Run axe against a rendered container and fail on any serious or critical
 * violation.
 */
export async function expectNoA11yViolations(
  container: HTMLElement,
): Promise<void> {
  const results: AxeResults = await axe.run(container, {
    // Colour contrast needs real layout and computed styles; jsdom has neither,
    // so the rule reports nothing useful here. It is covered visually instead.
    rules: { 'color-contrast': { enabled: false } },
  });

  const blocking = results.violations.filter(
    (v) => v.impact !== null && v.impact !== undefined && BLOCKING_IMPACTS.has(v.impact),
  );

  expect(
    blocking,
    blocking.length > 0
      ? `Accessibility violations:\n\n${format(blocking)}`
      : '',
  ).toHaveLength(0);
}
