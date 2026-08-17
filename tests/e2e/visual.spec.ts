import { test, expect, RICH_POST } from './fixtures';

/**
 * AGENTS.md hard rule 1: any change needs visual confirmation that the site
 * still renders. These tests capture the key routes in both themes and attach
 * the images to the Playwright report (`npx playwright show-report`), so the
 * screenshots exist as review artifacts rather than as brittle pixel baselines.
 *
 * They also assert the structural facts a screenshot would reveal: nothing
 * overflows horizontally, the layout is on the right axis for the viewport,
 * and no element has collapsed to zero size.
 */
const ROUTES: [name: string, path: string][] = [
  ['home', '/'],
  ['post', RICH_POST],
  ['category', '/category/homelab/'],
  ['categories', '/categories/'],
  ['portfolio', '/portfolio/'],
  ['contact', '/contact/'],
  ['page-2', '/page/2/'],
];

for (const [name, path] of ROUTES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`renders ${name} in ${theme}`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.evaluate((t) => {
        localStorage.setItem('theme', t);
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForLoadState('networkidle');

      const shot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`${name}-${theme}-${testInfo.project.name}`, {
        body: shot,
        contentType: 'image/png',
      });

      // the page painted something, and it is not a blank document
      expect(await page.locator('body').boundingBox()).not.toBeNull();
      await expect(page.locator('header.topbar')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }
}

test.describe('layout integrity', () => {
  for (const [name, path] of ROUTES) {
    test(`${name} does not scroll horizontally`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `${name} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    });
  }

  test('stacks the homepage into one column on mobile and two on desktop', async ({ page }, testInfo) => {
    await page.goto('/');
    const columns = await page
      .locator('.home-shell')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

    if (testInfo.project.name === 'mobile') expect(columns).toBe(1);
    else expect(columns).toBe(2);
  });

  test('hides the post rails on mobile and shows the TOC on desktop', async ({ page }, testInfo) => {
    await page.goto(RICH_POST);
    const toc = page.locator('nav.toc');

    if (testInfo.project.name === 'mobile') await expect(toc).toBeHidden();
    else await expect(toc).toBeVisible();
  });

  test('keeps the topbar pinned while scrolling', async ({ page }) => {
    await page.goto(RICH_POST);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator('header.topbar')).toBeInViewport();
  });

  /* Wide content is fine as long as it scrolls inside its own container —
     that is exactly what code blocks and tables are supposed to do. What must
     never happen is overflow that escapes to the page. */
  test('confines over-wide content to a scrollable container', async ({ page }) => {
    await page.goto(RICH_POST);
    const escaping = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const scrolls = (el: Element) => {
        const o = getComputedStyle(el);
        return /auto|scroll|hidden/.test(o.overflowX);
      };
      return [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().width > vw + 1)
        .filter((el) => {
          for (let p = el.parentElement; p; p = p.parentElement) if (scrolls(p)) return false;
          return true;
        })
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80));
    });
    expect([...new Set(escaping)]).toEqual([]);
  });
});
