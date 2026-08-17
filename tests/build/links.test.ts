import { describe, it, expect, beforeAll } from 'vitest';
import { distFiles, docOf, htmlPages, internalRefs, requireDist, resolveRoute } from '../helpers/dist';

beforeAll(requireDist);

const files = new Set(distFiles());
const pages = htmlPages();

/**
 * Crawls every built page and resolves each internal href/src the way a static
 * host would. This is the regression net for the case/Unicode/whitespace 404s
 * that category, tag, and post links have hit before.
 */
describe('internal link integrity', () => {
  const broken: string[] = [];

  beforeAll(() => {
    for (const { file, route } of pages) {
      for (const { attr, value } of internalRefs(file)) {
        if (!value.startsWith('/')) {
          broken.push(`${route}: relative ${attr}="${value}" (site expects root-relative URLs)`);
          continue;
        }
        if (!resolveRoute(value, files)) broken.push(`${route}: ${attr}="${value}" → 404`);
      }
    }
  });

  it('resolves every internal link and asset reference', () => {
    expect([...new Set(broken)].sort()).toEqual([]);
  });
});

describe('link hygiene', () => {
  it('leaves no href empty or set to a bare "#"', () => {
    const bad: string[] = [];
    for (const { file, route } of pages) {
      for (const a of docOf(file).querySelectorAll('a')) {
        const href = a.getAttribute('href');
        if (href === null || href.trim() === '' || href.trim() === '#') {
          bad.push(`${route}: <a> with href="${href}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  /* Scoped to site chrome. Legacy WordPress-imported prose carries hand-written
     `target="_blank"` anchors without rel; that is a content backlog, not a
     regression in the templates this suite guards. */
  it('gives every new-tab link in the site chrome rel="noopener"', () => {
    const bad: string[] = [];
    for (const { file, route } of pages) {
      for (const a of docOf(file).querySelectorAll('a[target="_blank"]')) {
        if (a.closest('.prose')) continue;
        if (!(a.getAttribute('rel') ?? '').includes('noopener')) {
          bad.push(`${route}: ${a.getAttribute('href')}`);
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('points every in-page anchor at an element that exists', () => {
    const bad: string[] = [];
    for (const { file, route } of pages) {
      const doc = docOf(file);
      const ids = new Set([...doc.querySelectorAll('[id]')].map((el) => el.getAttribute('id')!));
      for (const a of doc.querySelectorAll('a[href^="#"]')) {
        const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
        if (id && !ids.has(id)) bad.push(`${route}: #${id}`);
      }
    }
    expect(bad).toEqual([]);
  });

  /* Guards astro.config.mjs's `site` against being pointed at a dev URL — the
     sitemap and every canonical/og URL derive from it. Post prose is exempt:
     tutorials legitimately talk about localhost:8080. */
  it('never emits a localhost URL in a canonical, og, or link target', () => {
    const bad: string[] = [];
    for (const { file, route } of pages) {
      const doc = docOf(file);
      const urls = [
        ...[...doc.querySelectorAll('link[href], a[href]')].map((el) => el.getAttribute('href')),
        ...[...doc.querySelectorAll('meta[content]')].map((el) => el.getAttribute('content')),
        ...[...doc.querySelectorAll('img[src], script[src]')].map((el) => el.getAttribute('src')),
      ];
      for (const u of urls) {
        if (u && /(localhost|127\.0\.0\.1)/.test(u)) bad.push(`${route}: ${u}`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});

describe('images', () => {
  it('gives every image an alt attribute', () => {
    const bad: string[] = [];
    for (const { file, route } of pages) {
      for (const img of docOf(file).querySelectorAll('img')) {
        if (img.getAttribute('alt') === null) bad.push(`${route}: ${img.getAttribute('src')}`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
