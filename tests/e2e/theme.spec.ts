import { test, expect, RICH_POST } from './fixtures';

const themeOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

const bodyBg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('theme toggle', () => {
  test('switches the theme and repaints the page', async ({ page }) => {
    await page.goto('/');
    const before = await themeOf(page);
    const bgBefore = await bodyBg(page);

    await page.locator('#theme-toggle').click();

    expect(await themeOf(page)).toBe(before === 'dark' ? 'light' : 'dark');
    expect(await bodyBg(page)).not.toBe(bgBefore);
  });

  test('persists the choice across a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#theme-toggle').click();
    const chosen = await themeOf(page);

    await page.reload();
    expect(await themeOf(page)).toBe(chosen);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(chosen);
  });

  test('carries the choice to another page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#theme-toggle').click();
    const chosen = await themeOf(page);

    await page.goto(RICH_POST);
    expect(await themeOf(page)).toBe(chosen);
  });

  test('describes the theme it would switch to', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');

    const expected = (await themeOf(page)) === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    await expect(toggle).toHaveAttribute('aria-label', expected);

    await toggle.click();
    const next = (await themeOf(page)) === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    await expect(toggle).toHaveAttribute('aria-label', next);
    expect(next).not.toBe(expected);
  });

  test('shows the icon for the theme you would switch to', async ({ page }) => {
    await page.goto('/');
    const sun = page.locator('#theme-toggle .icon-sun');
    const moon = page.locator('#theme-toggle .icon-moon');

    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await expect(moon).toBeVisible();
    await expect(sun).toBeHidden();

    await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
    await expect(sun).toBeVisible();
    await expect(moon).toBeHidden();
  });

  test('announces the change for embedded widgets to pick up', async ({ page }) => {
    await page.goto(RICH_POST);
    const detail = page.evaluate(
      () =>
        new Promise<string>((resolve) =>
          document.addEventListener('themechange', (e) => resolve((e as CustomEvent).detail.theme), {
            once: true,
          })
        )
    );
    await page.locator('#theme-toggle').click();
    expect(await detail).toBe(await themeOf(page));
  });
});

test.describe('theme on first visit', () => {
  test.use({ colorScheme: 'dark' });
  test('follows the OS preference when nothing is saved', async ({ page }) => {
    await page.goto('/');
    expect(await themeOf(page)).toBe('dark');
  });
});

test.describe('theme on first visit (light OS)', () => {
  test.use({ colorScheme: 'light' });
  test('follows the OS preference when nothing is saved', async ({ page }) => {
    await page.goto('/');
    expect(await themeOf(page)).toBe('light');
  });

  test('lets a saved dark choice override a light OS', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    expect(await themeOf(page)).toBe('dark');
  });
});

test.describe('theme legibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps body text readable against the background in ${theme}`, async ({ page }) => {
      await page.goto(RICH_POST);
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);

      const { bg, fg } = await page.evaluate(() => {
        const p = document.querySelector('.prose p') ?? document.body;
        return {
          bg: getComputedStyle(document.body).backgroundColor,
          fg: getComputedStyle(p).color,
        };
      });

      const relative = (rgb: string) => {
        const [r, g, b] = rgb.match(/\d+/g)!.map(Number).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [a, b2] = [relative(bg), relative(fg)].sort((x, y) => y - x);
      const contrast = (a + 0.05) / (b2 + 0.05);

      expect(contrast, `${theme} body contrast`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
