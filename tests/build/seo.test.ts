import { describe, it, expect, beforeAll } from 'vitest';
import { docOf, htmlPages, requireDist } from '../helpers/dist';
import { readPosts } from '../helpers/posts';
import { SITE_DESCRIPTION, metaDescription, postDescription } from '../../src/lib/description';

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

  it('advertises the RSS feed', () => {
    const bad = pages.filter(
      ({ doc }) =>
        doc.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.getAttribute('href') !==
        '/rss.xml'
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

/* Tag and pagination pages are thin listings: kept out of the index, but
   `follow` so crawlers still reach the posts through them. Categories are
   deliberately left indexable for now. */
describe('index policy', () => {
  const isNoindexRoute = (route: string) => route.startsWith('/tag/') || route.startsWith('/page/');

  it('marks every tag and pagination page "noindex, follow"', () => {
    const listings = pages.filter(({ route }) => isNoindexRoute(route));
    expect(listings.some(({ route }) => route.startsWith('/tag/'))).toBe(true);
    expect(listings.some(({ route }) => route.startsWith('/page/'))).toBe(true);
    const bad = listings.filter(({ doc }) => meta(doc, 'meta[name="robots"]') !== 'noindex, follow');
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('leaves every other page indexable', () => {
    const bad = pages.filter(
      ({ route, doc }) => !isNoindexRoute(route) && doc.querySelector('meta[name="robots"]') !== null
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('never tells crawlers to stop following links', () => {
    const bad = allPages.filter(({ doc }) => meta(doc, 'meta[name="robots"]')?.includes('nofollow'));
    expect(bad.map((p) => p.route)).toEqual([]);
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

describe('post descriptions', () => {
  const articles = posts.map((p) => ({ post: p, doc: docOf(`blog/${p.slug}/index.html`) }));
  const hasOwn = (p: (typeof posts)[number]) =>
    typeof p.data.description === 'string' && p.data.description.trim() !== '';

  it('has posts with and without a frontmatter description to check', () => {
    expect(articles.some(({ post }) => hasOwn(post))).toBe(true);
    expect(articles.some(({ post }) => !hasOwn(post))).toBe(true);
  });

  it('uses the frontmatter description whenever there is one', () => {
    const bad = articles.filter(
      ({ post, doc }) =>
        hasOwn(post) &&
        meta(doc, 'meta[name="description"]') !== metaDescription(post.data.description)
    );
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('derives the description from the body when the frontmatter has none', () => {
    const bad = articles.filter(
      ({ post, doc }) =>
        !hasOwn(post) &&
        meta(doc, 'meta[name="description"]') !== metaDescription(postDescription(undefined, post.body))
    );
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  /* the point of the fallback: a post with prose must not ship the same
     site-wide description as every other undescribed post */
  it('falls back to the site default only for posts with no prose at all', () => {
    const defaulted = articles.filter(
      ({ doc }) => meta(doc, 'meta[name="description"]') === metaDescription(SITE_DESCRIPTION)
    );
    const withProse = defaulted.filter(
      ({ post }) => postDescription(undefined, post.body) !== SITE_DESCRIPTION
    );
    expect(withProse.map(({ post }) => post.slug)).toEqual([]);
  });

  it('leaves no markdown or HTML syntax in a generated description', () => {
    const bad = articles.filter(({ post, doc }) => {
      if (hasOwn(post)) return false;
      const d = meta(doc, 'meta[name="description"]')!;
      return /```|!\[|\]\(|<\/?[a-z][^>]*>|&#?\w+;|\s{2,}|^\s|\s$/i.test(d);
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('gives og:description and twitter:description the same text', () => {
    const bad = articles.filter(({ doc }) => {
      const d = meta(doc, 'meta[name="description"]');
      return (
        meta(doc, 'meta[property="og:description"]') !== d ||
        meta(doc, 'meta[name="twitter:description"]') !== d
      );
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });
});

describe('BlogPosting structured data', () => {
  const LD = 'script[type="application/ld+json"]';
  const articles = posts.map((p) => ({ post: p, doc: docOf(`blog/${p.slug}/index.html`) }));
  const parse = (doc: Document) => {
    try {
      return JSON.parse(doc.querySelector(LD)?.textContent ?? '');
    } catch {
      return null;
    }
  };
  const canonical = (doc: Document) => doc.querySelector('link[rel="canonical"]')!.getAttribute('href')!;

  it('puts exactly one valid JSON-LD block on every post page', () => {
    const bad = articles.filter(({ doc }) => doc.querySelectorAll(LD).length !== 1 || parse(doc) === null);
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('types it as a schema.org BlogPosting', () => {
    const bad = articles.filter(({ doc }) => {
      const ld = parse(doc);
      return ld?.['@context'] !== 'https://schema.org' || ld?.['@type'] !== 'BlogPosting';
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('points url and mainEntityOfPage at the canonical URL', () => {
    const bad = articles.filter(({ doc }) => {
      const ld = parse(doc);
      return ld?.url !== canonical(doc) || ld?.mainEntityOfPage?.['@id'] !== canonical(doc);
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('carries the title as headline and the meta description as description', () => {
    const bad = articles.filter(({ post, doc }) => {
      const ld = parse(doc);
      return (
        ld?.headline !== String(post.data.title) ||
        ld?.description !== meta(doc, 'meta[name="description"]')
      );
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('dates it with the frontmatter date, published and modified alike', () => {
    const bad = articles.filter(({ post, doc }) => {
      const ld = parse(doc);
      const iso = new Date(post.data.date).toISOString();
      return ld?.datePublished !== iso || ld?.dateModified !== iso;
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('names the author as a Person', () => {
    const bad = articles.filter(
      ({ doc }) =>
        JSON.stringify(parse(doc)?.author) !==
        JSON.stringify({ '@type': 'Person', name: 'Nidal Siddique Oritro', url: 'https://ioritro.com/' })
    );
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('includes an absolute image exactly when the post has a featured image', () => {
    const bad = articles.filter(({ post, doc }) => {
      const ld = parse(doc);
      if (!post.data.featured_image) return ld && 'image' in ld;
      return ld?.image !== new URL(post.data.featured_image, SITE).href;
    });
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  /* a raw "<" inside the block is what would let a title close the element */
  it('escapes every "<" inside the block', () => {
    const bad = articles.filter(({ doc }) => doc.querySelector(LD)!.textContent!.includes('<'));
    expect(bad.map(({ post }) => post.slug)).toEqual([]);
  });

  it('is emitted on post pages only', () => {
    const others = allPages.filter(
      ({ route, doc }) => !(route.startsWith('/blog/') && route !== '/blog/') && doc.querySelector(LD)
    );
    expect(others.map((p) => p.route)).toEqual([]);
  });
});

describe('the archive page', () => {
  const archive = () => pages.find((p) => p.route === '/archive/')!.doc;
  const rows = () => [...archive().querySelectorAll('.archive-list a')];

  it('is indexable, with a canonical on the production origin', () => {
    expect(archive().querySelector('meta[name="robots"]')).toBeNull();
    expect(archive().querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      `${SITE}/archive/`
    );
  });

  it('has a title and description no other page uses', () => {
    const title = archive().querySelector('title')!.textContent;
    const description = meta(archive(), 'meta[name="description"]');
    const others = pages.filter((p) => p.route !== '/archive/');
    expect(others.filter((p) => p.doc.querySelector('title')!.textContent === title)).toEqual([]);
    expect(others.filter((p) => meta(p.doc, 'meta[name="description"]') === description)).toEqual([]);
    expect(description).not.toBe(metaDescription(SITE_DESCRIPTION));
  });

  it('has exactly one h1', () => {
    expect(archive().querySelectorAll('h1')).toHaveLength(1);
  });

  it('links every post exactly once, by its canonical URL', () => {
    const hrefs = rows().map((a) => decodeURI(a.getAttribute('href')!));
    expect(hrefs).toHaveLength(posts.length);
    expect([...hrefs].sort()).toEqual(posts.map((p) => `/blog/${p.slug}/`).sort());
  });

  it('labels each row with the post title and a machine-readable date', () => {
    const bySlug = new Map(posts.map((p) => [`/blog/${p.slug}/`, p]));
    const bad = rows().filter((a) => {
      const post = bySlug.get(decodeURI(a.getAttribute('href')!));
      return (
        !post ||
        a.querySelector('.archive-title')?.textContent !== String(post.data.title) ||
        a.querySelector('time')?.getAttribute('datetime') !== new Date(post.data.date).toISOString()
      );
    });
    expect(bad.map((a) => a.getAttribute('href'))).toEqual([]);
  });

  it('lists posts newest first', () => {
    const times = rows().map((a) => Date.parse(a.querySelector('time')!.getAttribute('datetime')!));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('groups them under one h2 per year, newest year first', () => {
    const sections = [...archive().querySelectorAll('.archive-year')];
    const years = sections.map((s) => Number(s.querySelector('h2')!.textContent));
    expect(archive().querySelectorAll('h2')).toHaveLength(sections.length);
    expect(years).toEqual([...new Set(years)].sort((a, b) => b - a));
    expect(years.length).toBeGreaterThan(1);

    for (const section of sections) {
      const year = Number(section.querySelector('h2')!.textContent);
      const rowYears = [...section.querySelectorAll('time')].map((t) =>
        new Date(t.getAttribute('datetime')!).getFullYear()
      );
      expect(rowYears.length).toBeGreaterThan(0);
      expect(rowYears.filter((y) => y !== year)).toEqual([]);
    }
  });

  it('is linked from the top nav and the footer of every page', () => {
    const bad = pages.filter(
      ({ doc }) =>
        !doc.querySelector('nav.topnav a[href="/archive/"]') ||
        !doc.querySelector('footer.site-footer a[href="/archive/"]')
    );
    expect(bad.map((p) => p.route)).toEqual([]);
  });

  it('marks its own nav link active, and not the Home link', () => {
    const active = [...archive().querySelectorAll('.topnav-link.active')].map((a) => a.textContent);
    expect(active).toEqual(['Archive']);
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
