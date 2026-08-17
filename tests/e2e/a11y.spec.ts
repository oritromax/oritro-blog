import { test, expect, RICH_POST } from './fixtures';

const ROUTES = ['/', RICH_POST, '/category/homelab/', '/categories/', '/portfolio/', '/contact/'];

test.describe('keyboard and semantics', () => {
  for (const path of ROUTES) {
    test(`${path} exposes landmarks and a single main heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('header.topbar')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();

      // the template contributes exactly one h1 (post prose may add its own)
      const chromeH1s = await page
        .locator('h1')
        .evaluateAll((els) => els.filter((el) => !el.closest('.prose')).length);
      expect(chromeH1s, `${path} h1 count`).toBe(1);
    });
  }

  test('reaches the theme toggle by keyboard and operates it with Enter', async ({ page }) => {
    await page.goto('/');
    const before = await page.evaluate(() => document.documentElement.dataset.theme);

    await page.locator('#theme-toggle').focus();
    await expect(page.locator('#theme-toggle')).toBeFocused();
    await page.keyboard.press('Enter');

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);
  });

  test('reaches the first post from the top of the page by tabbing', async ({ page }) => {
    await page.goto('/');
    const target = await page.locator('.post-row-title a').first().getAttribute('href');

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href ?? '');
      if (href.endsWith(target!)) return;
    }
    throw new Error(`could not tab to ${target} within 40 stops`);
  });

  test('gives every interactive control an accessible name', async ({ page }) => {
    for (const path of ROUTES) {
      await page.goto(path);
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll('button, a')]
          .filter((el) => {
            const label = el.getAttribute('aria-label') ?? el.textContent ?? '';
            return label.trim() === '' && !el.querySelector('img[alt]:not([alt=""])');
          })
          .map((el) => el.outerHTML.slice(0, 90))
      );
      expect(unnamed, `unnamed control on ${path}`).toEqual([]);
    }
  });

  test('marks decorative icons as hidden from assistive tech', async ({ page }) => {
    await page.goto(RICH_POST);
    const exposed = await page.evaluate(() =>
      [...document.querySelectorAll('svg')]
        .filter((svg) => svg.getAttribute('aria-hidden') !== 'true' && !svg.querySelector('title'))
        .map((svg) => svg.parentElement?.outerHTML.slice(0, 80) ?? '')
    );
    expect(exposed).toEqual([]);
  });

  test('keeps a visible focus indicator on links', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.post-row-title a').first();
    await link.focus();

    const outlined = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' || s.boxShadow !== 'none' || s.textDecorationLine !== 'none';
    });
    expect(outlined).toBe(true);
  });
});

test.describe('no runtime errors', () => {
  for (const path of ROUTES) {
    test(`${path} loads clean`, async ({ page, consoleErrors }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      expect(consoleErrors, `console errors on ${path}`).toEqual([]);
    });
  }
});
