import { test, expect } from './fixtures';

test.describe('homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the identity sidebar and the latest posts', async ({ page }) => {
    await expect(page).toHaveTitle(/Nidal Siddique Oritro/);
    await expect(page.locator('.sidebar-role')).toBeVisible();
    await expect(page.locator('.sidebar img.avatar')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latest posts' })).toBeVisible();
    await expect(page.locator('article.post-row')).toHaveCount(10);
  });

  test('states the total post count', async ({ page }) => {
    const eyebrow = await page.locator('.home-main .eyebrow').first().innerText();
    const total = Number(eyebrow.match(/\d+/)![0]);
    expect(total).toBeGreaterThan(40);
  });

  test('every post row links to a page that loads', async ({ page }) => {
    const links = await page.locator('.post-row-title a').all();
    expect(links.length).toBe(10);
    for (const link of links) {
      const href = await link.getAttribute('href');
      const res = await page.request.get(href!);
      expect(res.status(), `${href} did not load`).toBe(200);
    }
  });

  test('sidebar categories link through to a matching listing', async ({ page }) => {
    const row = page.locator('.cat-list li').first();
    const name = (await row.locator('.cat-name').innerText()).trim();
    const count = Number(await row.locator('.cat-count').innerText());

    await row.locator('a').click();
    await expect(page).toHaveURL(new RegExp(`/category/${name}/?$`));
    await expect(page.locator('h1.listing-title')).toContainText(name);
    await expect(page.locator('article.post-row')).toHaveCount(count);
  });

  test('shows a pagination control with the first page current', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Pagination' });
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveText('1');
    await expect(nav.locator('span.btn[aria-disabled="true"]').first()).toContainText('Previous');
  });

  test('loads without console errors', async ({ page, consoleErrors }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('pagination', () => {
  test('walks forward and back between pages', async ({ page }) => {
    await page.goto('/');
    const firstTitle = await page.locator('.post-row-title').first().innerText();

    await page.getByRole('link', { name: /Next/ }).click();
    await expect(page).toHaveURL(/\/page\/2\/?$/);
    await expect(page.locator('.home-main .eyebrow')).toContainText('Page 2 of');
    await expect(page.locator('.post-row-title').first()).not.toHaveText(firstTitle);

    await page.getByRole('link', { name: /Previous/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.post-row-title').first()).toHaveText(firstTitle);
  });

  test('disables Next on the last page', async ({ page }) => {
    await page.goto('/');
    const last = page.locator('.pagination-pages .page-num').last();
    await last.click();

    const nav = page.getByRole('navigation', { name: 'Pagination' });
    await expect(nav.locator('span.btn[aria-disabled="true"]')).toContainText('Next');
    await expect(nav.locator('a.btn')).toContainText('Previous');
  });

  test('shows no duplicate posts across the first two pages', async ({ page }) => {
    await page.goto('/');
    const first = await page.locator('.post-row-title a').allInnerTexts();
    await page.goto('/page/2/');
    const second = await page.locator('.post-row-title a').allInnerTexts();
    expect(first.filter((t) => second.includes(t))).toEqual([]);
  });
});

test.describe('site chrome', () => {
  test('navigates between the main sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Portfolio' }).click();
    await expect(page).toHaveURL(/\/portfolio\/?$/);

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/contact\/?$/);

    await page.getByRole('link', { name: 'Homepage' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('marks the active section in the nav', async ({ page }) => {
    await page.goto('/portfolio/');
    await expect(page.locator('.topnav-link.active')).toHaveText('Portfolio');
  });

  test('redirects the legacy /blog/ URL to the homepage', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Latest posts' })).toBeVisible();
  });
});
