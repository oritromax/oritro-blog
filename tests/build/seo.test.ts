import { describe, it, expect, beforeAll } from 'vitest';
import { docOf, htmlPages, requireDist } from '../helpers/dist';
import { readPosts } from '../helpers/posts';

beforeAll(requireDist);

const SITE = 'https://ioritro.com';
const allPages = htmlPages().map(({ file, route }) => ({ route, doc: docOf(file) }));
const posts = readPosts();

/** Redirect stubs are deliberately chrome-less; they get their own checks. */
const isRedirect = (doc: Document) => doc.querySelector('meta[http-equiv="refresh"]') !== null;
const pages = allPages.filter((p) => !isRedirect(p.doc));
const redirects = allPages.filter((p) => isRedirect(p.doc));

const meta = (doc: Document, sel: string) =>
  doc.querySelector(sel)?.getAttribute('content') ?? null;

describe('every built page', () => {
  it('has a non-empty <title>', () => {
    const bad = pages.filter(({ doc }) => !doc.querySelector('title')?.textContent?.trim());
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('has a meta description no longer than the 160-char cap', () => {
    const bad = pages.filter(({ doc }) => {
      const d = meta(doc, 'meta[name="description"]');
      return !d || d.length === 0 || d.length > 160;
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('declares lang="en" and a viewport', () => {
    const bad = pages.filter(
      ({ doc }) =>
        doc.documentElement.getAttribute('lang') !== 'en' ||
        !meta(doc, 'meta[name="viewport"]')
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('sets an absolute canonical URL on the production origin', () => {
    const bad = pages.filter(({ doc }) => {
      const href = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
      return !href || !href.startsWith(`${SITE}/`);
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('gives each page a distinct canonical URL', () => {
    const seen = new Map<string, string[]>();
    for (const { route, doc } of pages) {
      const href = doc.querySelector('link[rel="canonical"]')!.getAttribute('href')!;
      seen.set(href, [...(seen.get(href) ?? []), route]);
    }
    expect([...seen.entries()].filter(([, routes]) => routes.length > 1)).toEqual([]);
  });

  it('sets the Open Graph and Twitter card tags', () => {
    const bad = pages.filter(({ doc }) => {
      for (const sel of [
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:url"]',
        'meta[property="og:image"]',
        'meta[property="og:type"]',
        'meta[name="twitter:card"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:image"]',
      ]) {
        if (!meta(doc, sel)?.trim()) return true;
      }
      return false;
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('uses an absolute og:image URL', () => {
    const bad = pages.filter(({ doc }) => !meta(doc, 'meta[property="og:image"]')!.startsWith('http'));
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('keeps og:url and the canonical URL in agreement', () => {
    const bad = pages.filter(
      ({ doc }) =>
        meta(doc, 'meta[property="og:url"]') !==
        doc.querySelector('link[rel="canonical"]')!.getAttribute('href')
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('links the sitemap', () => {
    const bad = pages.filter(({ doc }) => !doc.querySelector('link[rel="sitemap"]'));
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('renders the site chrome: topbar, nav, and footer', () => {
    const bad = pages.filter(
      ({ doc }) =>
        !doc.querySelector('header.topbar a.brand') ||
        !doc.querySelector('nav.topnav') ||
        !doc.querySelector('footer.site-footer')
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('ships the theme toggle with an accessible label', () => {
    const bad = pages.filter(
      ({ doc }) => !doc.querySelector('#theme-toggle')?.getAttribute('aria-label')
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('applies the saved theme before paint to avoid a flash', () => {
    const bad = pages.filter(({ doc }) => {
      const inline = [...doc.querySelectorAll('head script')].map((s) => s.textContent ?? '');
      return !inline.some((s) => s.includes('localStorage.getItem("theme")'));
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  /* Post bodies imported from WordPress sometimes carry their own `# Heading`;
     that is a content matter. The template must contribute exactly one h1. */
  it('renders exactly one h1 of its own', () => {
    const bad = pages.filter(
      ({ doc }) => [...doc.querySelectorAll('h1')].filter((h) => !h.closest('.prose')).length !== 1
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });
});

describe('the /blog/ redirect stub', () => {
  it('exists', () => {
    expect(redirects.map((r) => r.route)).toEqual(['/blog/']);
  });

  const stub = () => redirects[0].doc;

  /* A static host sends no Location header, so the emitted HTML has to do the
     redirecting itself — this guards against reverting to a header-only 301. */
  it('redirects immediately via meta refresh', () => {
    expect(stub().querySelector('meta[http-equiv="refresh"]')!.getAttribute('content')).toBe(
      '0; url=/'
    );
  });

  it('redirects via script as well, for hosts that strip meta refresh', () => {
    const scripts = [...stub().querySelectorAll('script')].map((s) => s.textContent ?? '');
    expect(scripts.some((s) => s.includes("location.replace('/')"))).toBe(true);
  });

  it('offers a link for anyone the redirect does not reach', () => {
    expect(stub().querySelector('body a[href="/"]')).not.toBeNull();
  });

  it('is excluded from search indexes and canonicalises to the homepage', () => {
    expect(stub().querySelector('meta[name="robots"]')!.getAttribute('content')).toContain(
      'noindex'
    );
    expect(stub().querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(`${SITE}/`);
  });
});

describe('article pages', () => {
  const articles = pages.filter(({ route }) => route.startsWith('/blog/') && route !== '/blog/');

  it('covers every post', () => {
    expect(articles).toHaveLength(posts.length);
  });

  it('declares og:type=article with a published time', () => {
    const bad = articles.filter(({ doc }) => {
      return (
        meta(doc, 'meta[property="og:type"]') !== 'article' ||
        !meta(doc, 'meta[property="article:published_time"]')
      );
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('sets the canonical URL to the post URL with a trailing slash', () => {
    const bad = articles.filter(({ route, doc }) => {
      const href = doc.querySelector('link[rel="canonical"]')!.getAttribute('href')!;
      return decodeURI(href) !== `${SITE}${decodeURI(route)}`;
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });
});

describe('listing pages', () => {
  it('titles the homepage with the author name', () => {
    const home = pages.find((p) => p.route === '/')!;
    expect(home.doc.querySelector('title')!.textContent).toContain('Nidal Siddique Oritro');
  });

  it('shows at most 10 post rows per listing page', () => {
    const listings = pages.filter(({ route }) => route === '/' || route.startsWith('/page/'));
    expect(listings.length).toBeGreaterThan(1);
    const bad = listings.filter(({ doc }) => doc.querySelectorAll('article.post-row').length > 10);
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('fills every listing page except the last', () => {
    const listings = pages
      .filter(({ route }) => route === '/' || route.startsWith('/page/'))
      .sort((a, b) => (a.route === '/' ? -1 : b.route === '/' ? 1 : a.route.localeCompare(b.route)));
    for (const { route, doc } of listings.slice(0, -1)) {
      expect(doc.querySelectorAll('article.post-row').length, `${route} is short`).toBe(10);
    }
  });

  it('states a post count on category and tag pages that matches the rows shown', () => {
    const listings = pages.filter(
      ({ route }) => route.startsWith('/category/') || route.startsWith('/tag/')
    );
    expect(listings.length).toBeGreaterThan(0);
    const bad = listings.filter(({ doc }) => {
      const stated = Number((doc.querySelector('.eyebrow')?.textContent ?? '').match(/\d+/)?.[0]);
      return stated !== doc.querySelectorAll('article.post-row').length;
    });
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('never renders a category or tag page with no posts', () => {
    const listings = pages.filter(
      ({ route }) => route.startsWith('/category/') || route.startsWith('/tag/')
    );
    const empty = listings.filter(({ doc }) => doc.querySelectorAll('article.post-row').length === 0);
    expect(empty.map((p) => p.route)).toEqual([]);
  });
});
