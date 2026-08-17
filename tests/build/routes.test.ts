import { describe, it, expect, beforeAll } from 'vitest';
import { distFiles, htmlPages, readDist, requireDist, resolveRoute } from '../helpers/dist';
import { readPosts } from '../helpers/posts';
import { categorySlug, tagSlug } from '../../src/lib/category';

beforeAll(requireDist);

const posts = readPosts();
const files = new Set(distFiles());
const POSTS_PER_PAGE = 10;

describe('static pages', () => {
  it.each(['/', '/portfolio', '/contact', '/consultation', '/categories', '/blog'])(
    'builds %s',
    (route) => {
      expect(resolveRoute(route, files), `${route} did not build`).not.toBeNull();
    }
  );
});

describe('post pages', () => {
  it('builds one page per post', () => {
    const missing = posts.filter((p) => !resolveRoute(`/blog/${p.slug}/`, files));
    expect(missing.map((p) => p.file)).toEqual([]);
  });

  /* `blog/index.html` is the listing page, not a post */
  const postDirs = [...files]
    .filter((f) => f.startsWith('blog/') && f.endsWith('/index.html') && f !== 'blog/index.html')
    .map((f) => f.slice('blog/'.length, -'/index.html'.length));

  it('builds no post page without a source file', () => {
    const known = new Set(posts.map((p) => p.slug));
    expect(postDirs.filter((slug) => !known.has(slug.normalize('NFC')))).toEqual([]);
  });

  it('writes post directories in NFC so hrefs match byte-for-byte', () => {
    expect(postDirs.filter((d) => d !== d.normalize('NFC'))).toEqual([]);
  });

  it('builds exactly as many post pages as there are posts', () => {
    expect(postDirs).toHaveLength(posts.length);
  });
});

describe('pagination', () => {
  const expectedPages = Math.ceil(posts.length / POSTS_PER_PAGE);

  it(`builds /page/2 … /page/N for ${posts.length} posts`, () => {
    for (let n = 2; n <= expectedPages; n++) {
      expect(resolveRoute(`/page/${n}/`, files), `/page/${n} did not build`).not.toBeNull();
    }
  });

  it('does not build a page past the last one', () => {
    expect(resolveRoute(`/page/${expectedPages + 1}/`, files)).toBeNull();
  });

  it('builds /page/1 only if the route exists at all (page 1 lives at /)', () => {
    // Astro's route only starts at 1, so /page/1 may exist; / must always work
    expect(resolveRoute('/', files)).toBe('index.html');
  });
});

describe('category routes', () => {
  const slugs = [
    ...new Set(posts.flatMap((p) => (p.data.categories ?? ['Uncategorized']).map(categorySlug))),
  ];

  it('builds a page for every category in the content', () => {
    const missing = slugs.filter((s) => !resolveRoute(`/category/${encodeURIComponent(s)}/`, files));
    expect(missing).toEqual([]);
  });

  it('builds no category page that no post belongs to', () => {
    const known = new Set(slugs);
    const orphans = [...files]
      .filter((f) => f.startsWith('category/') && f.endsWith('/index.html'))
      .map((f) => f.slice('category/'.length, -'/index.html'.length).normalize('NFC'))
      .filter((s) => !known.has(s));
    expect(orphans).toEqual([]);
  });

  it('builds lowercase directories only', () => {
    const upper = [...files]
      .filter((f) => f.startsWith('category/'))
      .map((f) => f.slice('category/'.length).split('/')[0])
      .filter((d) => d !== d.toLowerCase());
    expect(upper).toEqual([]);
  });
});

describe('tag routes', () => {
  const slugs = [...new Set(posts.flatMap((p) => ((p.data.tags ?? []) as string[]).map(tagSlug)))];

  it('builds a page for every tag in the content', () => {
    const missing = slugs.filter((s) => !resolveRoute(`/tag/${encodeURIComponent(s)}/`, files));
    expect(missing).toEqual([]);
  });

  it('builds no tag page that no post carries', () => {
    const known = new Set(slugs);
    const orphans = [...files]
      .filter((f) => f.startsWith('tag/') && f.endsWith('/index.html'))
      .map((f) => f.slice('tag/'.length, -'/index.html'.length).normalize('NFC'))
      .filter((s) => !known.has(s));
    expect(orphans).toEqual([]);
  });
});

describe('assets and sitemap', () => {
  it('emits the sitemap index and at least one sitemap', () => {
    expect(files.has('sitemap-index.xml')).toBe(true);
    expect([...files].some((f) => /^sitemap-\d+\.xml$/.test(f))).toBe(true);
  });

  it('lists every post in the sitemap under the production origin', () => {
    const xml = [...files]
      .filter((f) => /^sitemap-\d+\.xml$/.test(f))
      .map(readDist)
      .join('');
    const missing = posts.filter((p) => !xml.includes(`/blog/${encodeURI(p.slug)}/`));
    expect(missing.map((p) => p.slug)).toEqual([]);
    expect(xml).toContain('https://ioritro.com/');
    expect(xml).not.toContain('localhost');
  });

  it('ships the avatar and favicon referenced by the layout', () => {
    expect(files.has('blog-avatar-final.jpg')).toBe(true);
    expect(files.has('favicon.png')).toBe(true);
  });

  it('builds a reasonable number of pages', () => {
    expect(htmlPages().length).toBeGreaterThan(posts.length);
  });
});

