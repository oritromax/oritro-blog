import { test as base, expect, type Page } from '@playwright/test';

/**
 * The layout loads Google Analytics, a self-hosted stats script, and Giscus.
 * None of them are under test and all of them make the suite depend on the
 * network, so they are blocked. Anything else third-party is blocked too, so a
 * newly-added tracker shows up as a deliberate decision rather than as flake.
 */
const THIRD_PARTY = /googletagmanager\.com|google-analytics\.com|stats\.ioritro\.com|giscus\.app/;

export const test = base.extend<{ page: Page; consoleErrors: string[] }>({
  page: async ({ page }, use) => {
    await page.route(THIRD_PARTY, (route) => route.abort());
    await use(page);
  },

  /**
   * Console errors and uncaught page errors. Failures for the third-party
   * URLs blocked above are dropped — they are this fixture's own doing —
   * but a load failure from any other origin still counts.
   */
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      if (THIRD_PARTY.test(msg.location().url)) return;
      errors.push(`${msg.text()} (${msg.location().url})`);
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await use(errors);
  },
});

export { expect };

/** A post slug that exercises the hero, TOC, code frames, chips, and tags. */
export const RICH_POST = '/blog/2026-05-18-fixing-the-elgato-wave-3-on-cachyos-kde/';
