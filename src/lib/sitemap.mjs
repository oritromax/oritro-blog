/**
 * Sitemap policy, kept out of astro.config.mjs so it can be unit-tested.
 *
 * Runs at config time, before the content layer exists — so post dates are
 * read straight from the markdown frontmatter rather than `astro:content`.
 */
import { readFileSync, readdirSync } from 'node:fs';

/** Tag and pagination pages are noindex; /blog/ is a redirect stub. */
export function sitemapFilter(page) {
  const { pathname } = new URL(page);
  return !(pathname.startsWith('/tag/') || pathname.startsWith('/page/') || pathname === '/blog/');
}

/* YAML reads a zone-less timestamp as UTC; `new Date()` would read it as
   local time, so the zone is made explicit before parsing */
function parseFrontmatterDate(raw) {
  const value = raw.trim().replace(/^['"]|['"]$/g, '');
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const iso = value.replace(' ', 'T') + (hasZone || !value.includes(':') ? '' : 'Z');
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? null : date;
}

/** The `date:` of a markdown file's frontmatter block, or null. */
export function frontmatterDate(source) {
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = block?.[1].match(/^date:\s*(.+)$/m);
  return line ? parseFrontmatterDate(line[1]) : null;
}

/** Post slug (filename without extension, NFC) → frontmatter date. */
export function readPostDates(dir) {
  const dates = new Map();
  for (const file of readdirSync(dir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const date = frontmatterDate(readFileSync(new URL(file, dir), 'utf8'));
    if (date) dates.set(file.replace(/\.mdx?$/, '').normalize('NFC'), date);
  }
  return dates;
}

/**
 * Adds `lastmod` to post URLs only, from the post's own date. Everything else
 * is left without one: a build-time timestamp would churn on every deploy and
 * teach crawlers to ignore the field.
 */
export function withPostLastmod(item, postDates) {
  const match = new URL(item.url).pathname.match(/^\/blog\/([^/]+)\/$/);
  if (!match) return item;
  const date = postDates.get(decodeURIComponent(match[1]).normalize('NFC'));
  return date ? { ...item, lastmod: date.toISOString() } : item;
}
