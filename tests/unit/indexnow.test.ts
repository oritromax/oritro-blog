import { describe, it, expect } from 'vitest';
import { diffUrls, sitemapUrls } from '../../scripts/indexnow.mjs';

const sitemap = (...urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `<url><loc>${u}</loc><lastmod>2025-01-01T00:00:00.000Z</lastmod></url>`)
    .join('')}</urlset>`;

describe('sitemapUrls', () => {
  it('extracts every <loc> in order', () => {
    expect(sitemapUrls(sitemap('https://ioritro.com/', 'https://ioritro.com/blog/a/'))).toEqual([
      'https://ioritro.com/',
      'https://ioritro.com/blog/a/',
    ]);
  });

  it('unescapes XML entities and tolerates whitespace inside <loc>', () => {
    expect(sitemapUrls('<url><loc>\n  https://ioritro.com/?a=1&amp;b=2\n</loc></url>')).toEqual([
      'https://ioritro.com/?a=1&b=2',
    ]);
  });

  it('returns nothing for a document with no URLs', () => {
    expect(sitemapUrls('<html><body>502 Bad Gateway</body></html>')).toEqual([]);
  });
});

describe('diffUrls', () => {
  const a = 'https://ioritro.com/blog/a/';
  const b = 'https://ioritro.com/blog/b/';
  const c = 'https://ioritro.com/blog/c/';

  it('returns the local URLs the live sitemap does not have', () => {
    expect(diffUrls([a, b, c], [a])).toEqual([b, c]);
  });

  it('returns nothing when the live sitemap is up to date', () => {
    expect(diffUrls([a, b], [b, a])).toEqual([]);
  });

  it('ignores URLs that only exist live (removed pages are not submitted)', () => {
    expect(diffUrls([a], [a, b])).toEqual([]);
  });

  it('de-duplicates while keeping local order', () => {
    expect(diffUrls([c, b, c, a], [a])).toEqual([c, b]);
  });

  it('treats everything as new against an empty live sitemap', () => {
    expect(diffUrls([a, b], [])).toEqual([a, b]);
  });
});
