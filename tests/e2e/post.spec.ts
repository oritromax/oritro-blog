import { test, expect, RICH_POST } from './fixtures';

test.describe('post page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(RICH_POST);
  });

  test('renders the hero with title, category, reading time, and date', async ({ page }) => {
    await expect(page.locator('h1.post-hero-title')).toBeVisible();
    await expect(page.locator('.post-hero-meta')).toContainText(/\d+ min read/);
    await expect(page.locator('.post-hero-meta time')).toHaveAttribute('datetime', /^\d{4}-/);
    await expect(page.locator('.post-hero-meta .chip').first()).toBeVisible();
  });

  test('tints the hero band with the category colour', async ({ page }) => {
    const cat = await page.locator('body').evaluate((el) => getComputedStyle(el).getPropertyValue('--cat'));
    expect(cat.trim()).not.toBe('');

    const bg = await page.locator('.post-hero').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('navigates back to the homepage from the hero', async ({ page }) => {
    await page.getByRole('link', { name: /Back to posts/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('renders the prose body', async ({ page }) => {
    await expect(page.locator('article.post-body .prose')).toBeVisible();
    const text = await page.locator('.prose').innerText();
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toContain(':::');
  });

  test('renders the author footer and related posts', async ({ page }) => {
    await expect(page.locator('.author-name')).toBeVisible();
    const related = page.locator('.related-card');
    await expect(related.first()).toBeVisible();
    expect(await related.count()).toBeLessThanOrEqual(3);

    const href = await related.first().getAttribute('href');
    expect(href).not.toBe(new URL(RICH_POST, 'https://x').pathname.replace(/\/$/, ''));
  });

  test('loads without console errors', async ({ page, consoleErrors }) => {
    await page.goto(RICH_POST);
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('table of contents', () => {
  // the rails (and the TOC with them) are hidden below 900px by design —
  // visual.spec.ts asserts that; there is nothing to drive on mobile
  test.skip(({ isMobile }) => !!isMobile, 'TOC is desktop-only');

  test('links to headings and scrolls to them', async ({ page }) => {
    await page.goto(RICH_POST);
    const toc = page.locator('nav.toc');
    await expect(toc).toBeVisible();

    const link = toc.locator('a[data-toc]').nth(1);
    const slug = await link.getAttribute('data-toc');
    await link.click();

    await expect(page).toHaveURL(new RegExp(`#${slug}$`));
    await expect(page.locator(`[id="${slug}"]`)).toBeInViewport({ ratio: 0.1 });
  });

  /* The IntersectionObserver in [...slug].astro highlights whichever heading is
     inside a narrow band near the top of the viewport, so the exact entry
     depends on scroll position. The contract worth pinning: exactly one entry
     is active, it names a real heading, and it follows you down the page. */
  test('marks exactly one entry, and it follows the scroll', async ({ page }) => {
    await page.goto(RICH_POST);
    const toc = page.locator('nav.toc');
    await expect(toc).toBeVisible();

    const activeSlug = async () => {
      const links = toc.locator('a.active');
      return (await links.count()) === 1 ? links.getAttribute('data-toc') : null;
    };

    /* the observer's band sits ~88px below the top, so a heading only lights up
       once it has scrolled up into it — scroll by page fraction, not by element */
    const scrollTo = (fraction: number) =>
      page.evaluate((f) => {
        const doc = document.documentElement;
        window.scrollTo(0, (doc.scrollHeight - window.innerHeight) * f);
      }, fraction);

    await scrollTo(0.35);
    await expect.poll(activeSlug, { timeout: 10_000 }).not.toBeNull();
    const first = await activeSlug();
    expect(await page.locator(`.prose [id="${first}"]`).count()).toBe(1);

    await scrollTo(0.9);
    await expect.poll(activeSlug, { timeout: 10_000 }).not.toBe(first);
    expect(await toc.locator('a.active').count()).toBe(1);
  });
});

test.describe('reading progress', () => {
  test('grows as the page scrolls', async ({ page }) => {
    await page.goto(RICH_POST);
    const bar = page.locator('.progress-bar');

    const widthAt = async () => (await bar.evaluate((el) => el.getBoundingClientRect().width)) as number;
    const atTop = await widthAt();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(widthAt).toBeGreaterThan(atTop);
  });
});

test.describe('code blocks', () => {
  test('renders the frame with a language label and copy button', async ({ page }) => {
    await page.goto(RICH_POST);
    const frame = page.locator('.prose .code').first();
    await expect(frame).toBeVisible();
    await expect(frame.locator('.code-lang')).not.toBeEmpty();
    await expect(frame.locator('button.code-copy')).toHaveText('Copy');
  });

  test('copies the code and confirms it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(RICH_POST);

    const frame = page.locator('.prose .code').first();
    const code = (await frame.locator('pre').innerText()).trim();
    await frame.locator('button.code-copy').click();

    await expect(frame.locator('button.code-copy')).toHaveText('Copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.trim()).toBe(code);

    // the label reverts so the button is reusable
    await expect(frame.locator('button.code-copy')).toHaveText('Copy', { timeout: 5000 });
  });

  test('keeps the code surface dark in both themes', async ({ page }) => {
    await page.goto(RICH_POST);
    const pre = page.locator('.prose .code pre').first();
    const bgIn = async () => pre.evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    const light = await bgIn();
    await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
    const dark = await bgIn();

    const luminance = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(luminance(light)).toBeLessThan(80);
    expect(luminance(dark)).toBeLessThan(80);
  });
});

test.describe('share', () => {
  test('copies the post URL to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(RICH_POST);

    await page.locator('#share-copy').click();
    await expect(page.locator('#share-copy')).toHaveAttribute('aria-label', 'Link copied');

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(RICH_POST);
  });

  test('offers a LinkedIn share link pointing at the canonical URL', async ({ page }) => {
    await page.goto(RICH_POST);
    const href = await page.getByRole('link', { name: 'Share on LinkedIn' }).getAttribute('href');
    expect(href).toContain('linkedin.com/sharing');
    expect(decodeURIComponent(href!)).toContain(`https://ioritro.com${RICH_POST}`);
  });
});

test.describe('taxonomy navigation', () => {
  test('reaches a category listing from a post chip', async ({ page }) => {
    await page.goto(RICH_POST);
    const chip = page.locator('.post-hero-meta .chip').first();
    // chips are uppercased by CSS, so read the source text, not the rendered text
    const name = (await chip.textContent())!.trim();
    await chip.click();

    await expect(page).toHaveURL(/\/category\//);
    await expect(page.locator('h1.listing-title')).toContainText(name);
    await expect(page.locator('article.post-row').first()).toBeVisible();
  });

  test('reaches a tag listing from a post tag', async ({ page }) => {
    await page.goto(RICH_POST);
    const tag = page.locator('.post-footer .tag').first();
    const name = (await tag.textContent())!.trim();
    await tag.click();

    await expect(page).toHaveURL(/\/tag\//);
    await expect(page.locator('h1.listing-title')).toContainText(name);
    await expect(page.locator('article.post-row').first()).toBeVisible();
  });

  test('lists every category on /categories and links each one', async ({ page }) => {
    await page.goto('/categories/');
    const links = page.locator('a[href^="/category/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 12); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect((await page.request.get(href!)).status(), `${href} did not load`).toBe(200);
    }
  });
});

test.describe('Bengali posts', () => {
  test('serves a post with a non-ASCII slug', async ({ page }) => {
    await page.goto('/');
    await page.goto('/page/5/');

    const link = page.locator('.post-row-title a').first();
    const href = await link.getAttribute('href');
    expect((await page.request.get(href!)).status()).toBe(200);
  });

  test('reaches a Bengali-slugged post directly', async ({ page }) => {
    const res = await page.goto('/blog/2018-07-08-বগা-লেক/');
    expect(res!.status()).toBe(200);
    await expect(page.locator('h1.post-hero-title')).toHaveText('বগা লেক');
  });
});
