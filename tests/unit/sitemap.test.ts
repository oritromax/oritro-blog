import { describe, it, expect } from 'vitest';
import { sitemapFilter, frontmatterDate, withPostLastmod } from '../../src/lib/sitemap.mjs';

const SITE = 'https://ioritro.com';

describe('sitemapFilter', () => {
  it.each(['/', '/contact/', '/consultation/', '/categories/', '/category/ai/', '/blog/some-post/'])(
    'keeps %s',
    (path) => {
      expect(sitemapFilter(`${SITE}${path}`)).toBe(true);
    }
  );

  it.each(['/tag/docker/', '/tag/%E0%A6%AD/', '/page/2/', '/page/10/', '/blog/'])('drops %s', (path) => {
    expect(sitemapFilter(`${SITE}${path}`)).toBe(false);
  });

  it('matches on path prefix, not on a substring elsewhere in the URL', () => {
    expect(sitemapFilter(`${SITE}/blog/my-tag/page/`)).toBe(true);
    expect(sitemapFilter(`${SITE}/blog/page/`)).toBe(true);
  });
});

describe('frontmatterDate', () => {
  const post = (date: string) => `---\ntitle: "x"\ndate: ${date}\ntags:\n  - a\n---\n\nbody\n`;

  it('reads a zone-less timestamp as UTC, the way YAML does', () => {
    expect(frontmatterDate(post('2025-04-01 10:30:00'))?.toISOString()).toBe('2025-04-01T10:30:00.000Z');
  });

  it('honours an explicit offset', () => {
    expect(frontmatterDate(post('2013-09-26T18:16:26+06:00'))?.toISOString()).toBe(
      '2013-09-26T12:16:26.000Z'
    );
  });

  it('reads a bare date as UTC midnight', () => {
    expect(frontmatterDate(post('2025-04-01'))?.toISOString()).toBe('2025-04-01T00:00:00.000Z');
  });

  it('ignores a "date:" line in the body', () => {
    expect(frontmatterDate('---\ntitle: x\n---\n\ndate: 2020-01-01\n')).toBeNull();
  });

  it('returns null for a missing or unparseable date', () => {
    expect(frontmatterDate('no frontmatter')).toBeNull();
    expect(frontmatterDate(post('someday'))).toBeNull();
  });
});

describe('withPostLastmod', () => {
  const dates = new Map([
    ['my-post', new Date('2025-04-01T10:30:00Z')],
    ['বগা-লেক'.normalize('NFC'), new Date('2014-01-02T00:00:00Z')],
  ]);

  it('stamps a post URL with its frontmatter date', () => {
    expect(withPostLastmod({ url: `${SITE}/blog/my-post/` }, dates)).toEqual({
      url: `${SITE}/blog/my-post/`,
      lastmod: '2025-04-01T10:30:00.000Z',
    });
  });

  it('resolves percent-encoded Bengali slugs, NFD or NFC', () => {
    for (const form of ['NFC', 'NFD'] as const) {
      const url = `${SITE}/blog/${encodeURIComponent('বগা-লেক'.normalize(form))}/`;
      expect(withPostLastmod({ url }, dates).lastmod).toBe('2014-01-02T00:00:00.000Z');
    }
  });

  it('leaves non-post URLs and unknown posts without a lastmod', () => {
    for (const path of ['/', '/contact/', '/category/ai/', '/blog/', '/blog/unknown/']) {
      const item = { url: `${SITE}${path}` };
      expect(withPostLastmod(item, dates)).toBe(item);
    }
  });
});
