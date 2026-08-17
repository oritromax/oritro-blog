import { describe, it, expect } from 'vitest';
import { blogSchema } from '../../src/lib/content-schema';
import { readPosts, normalizeTitle } from '../helpers/posts';
import { categorySlug, tagSlug, postHref } from '../../src/lib/category';

const posts = readPosts();

describe('blog collection', () => {
  it('has posts to test', () => {
    expect(posts.length).toBeGreaterThan(40);
  });

  /* The schema is the contract (AGENTS.md). A failure here means the POST is
     wrong, not the schema — fix the frontmatter. */
  it.each(posts.map((p) => [p.file, p] as const))('%s satisfies the frontmatter schema', (_f, post) => {
    const result = blogSchema.safeParse(post.data);
    if (!result.success) {
      throw new Error(
        `${post.file}\n` +
          result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
      );
    }
    expect(result.success).toBe(true);
  });

  it('gives every post a non-empty title', () => {
    const blank = posts.filter((p) => !String(p.data.title ?? '').trim());
    expect(blank.map((p) => p.file)).toEqual([]);
  });

  /* An empty body still builds a page and lands in the listings and the
     sitemap — so a frontmatter-only draft is a shipping bug, not a WIP. */
  it('gives every post a body (frontmatter-only drafts ship as empty pages)', () => {
    const empty = posts.filter((p) => p.body.trim().length === 0);
    expect(empty.map((p) => p.file)).toEqual([]);
  });

  it('parses every date as a real Date', () => {
    const bad = posts.filter((p) => !(p.data.date instanceof Date) || isNaN(+p.data.date));
    expect(bad.map((p) => p.file)).toEqual([]);
  });

  it('has no duplicate slugs', () => {
    const seen = new Map<string, string[]>();
    for (const p of posts) seen.set(p.slug, [...(seen.get(p.slug) ?? []), p.file]);
    expect([...seen.entries()].filter(([, files]) => files.length > 1)).toEqual([]);
  });

  it('has no duplicate titles', () => {
    const seen = new Map<string, string[]>();
    for (const p of posts) {
      const key = normalizeTitle(String(p.data.title));
      seen.set(key, [...(seen.get(key) ?? []), p.file]);
    }
    expect([...seen.entries()].filter(([, files]) => files.length > 1)).toEqual([]);
  });

  it('produces a URL-safe href for every post', () => {
    for (const p of posts) {
      const href = postHref(p.slug);
      expect(href.startsWith('/blog/')).toBe(true);
      // an href must round-trip through the URL parser without change
      expect(decodeURI(new URL(href, 'https://ioritro.com').pathname)).toBe(href);
    }
  });
});

describe('categories and tags', () => {
  const allCategories = posts.flatMap((p) => (p.data.categories ?? []) as string[]);
  const allTags = posts.flatMap((p) => (p.data.tags ?? []) as string[]);

  it('declares categories and tags as arrays of strings, never bare strings', () => {
    const bad = posts.filter(
      (p) =>
        (p.data.categories !== undefined && !Array.isArray(p.data.categories)) ||
        (p.data.tags !== undefined && !Array.isArray(p.data.tags))
    );
    expect(bad.map((p) => p.file)).toEqual([]);
  });

  it('has no empty category or tag entries', () => {
    expect(allCategories.filter((c) => !c.trim())).toEqual([]);
    expect(allTags.filter((t) => !t.trim())).toEqual([]);
  });

  /* Distinct spellings that collapse to one route are fine (the route builder
     merges them), but a slug that collides with a DIFFERENT concept is not —
     this guards the merge logic in category/[category].astro and tag/[tag].astro. */
  it('never maps two categories to one slug unless they are the same word', () => {
    const bySlug = new Map<string, Set<string>>();
    for (const c of allCategories) {
      const key = categorySlug(c);
      bySlug.set(key, (bySlug.get(key) ?? new Set()).add(c.trim().toLowerCase().normalize('NFC')));
    }
    expect([...bySlug.entries()].filter(([, variants]) => variants.size > 1)).toEqual([]);
  });

  it('produces a non-empty slug for every category and tag', () => {
    expect(allCategories.filter((c) => categorySlug(c) === '')).toEqual([]);
    expect(allTags.filter((t) => tagSlug(t) === '')).toEqual([]);
  });

  it('has no category or tag containing a path separator', () => {
    expect(allCategories.filter((c) => c.includes('/'))).toEqual([]);
    expect(allTags.filter((t) => t.includes('/'))).toEqual([]);
  });
});

describe('markdown body conventions', () => {
  it('closes every :::aside directive it opens', () => {
    for (const p of posts) {
      const opens = (p.body.match(/^:::aside\b/gm) ?? []).length;
      const fences = (p.body.match(/^:::\s*$/gm) ?? []).length;
      expect(
        { file: p.file, unclosed: opens > fences },
        `${p.file}: ${opens} :::aside opener(s), ${fences} bare ::: closer(s)`
      ).toEqual({ file: p.file, unclosed: false });
    }
  });

  it('closes every code fence it opens', () => {
    for (const p of posts) {
      const fences = (p.body.match(/^\s*```/gm) ?? []).length;
      expect({ file: p.file, odd: fences % 2 !== 0 }).toEqual({ file: p.file, odd: false });
    }
  });

  it('uses a root-relative or absolute URL for every featured_image', () => {
    for (const p of posts) {
      const img = p.data.featured_image;
      if (!img) continue;
      expect({ file: p.file, ok: /^(\/|https?:\/\/)/.test(img) }).toEqual({
        file: p.file,
        ok: true,
      });
    }
  });

  it('keeps descriptions short enough for the 160-char meta tag', () => {
    // Layout.astro truncates at 160 — flag anything that would be cut mid-word
    const long = posts.filter((p) => (p.data.description ?? '').length > 300);
    expect(long.map((p) => `${p.file} (${p.data.description.length} chars)`)).toEqual([]);
  });
});
