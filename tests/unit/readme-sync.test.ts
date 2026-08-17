import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPosts, normalizeTitle, REPO_ROOT } from '../helpers/posts';

/**
 * Enforces AGENTS.md hard rule 3: every post in src/content/blog must be
 * listed in the README's "Blog Posts" section, grouped by year, newest first.
 */
const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
const posts = readPosts();

const section = (() => {
  const start = readme.indexOf('## Blog Posts');
  expect(start, 'README is missing the "## Blog Posts" section').toBeGreaterThan(-1);
  const end = readme.indexOf('\n## ', start + 1);
  return readme.slice(start, end === -1 ? readme.length : end);
})();

/** `- **Title** - Month D, YYYY` under a `### YYYY` heading. */
interface Entry {
  title: string;
  date: string;
  year: number;
}

const entries: Entry[] = (() => {
  const out: Entry[] = [];
  let year = 0;
  for (const line of section.split('\n')) {
    const heading = line.match(/^###\s+(\d{4})\s*$/);
    if (heading) {
      year = Number(heading[1]);
      continue;
    }
    const item = line.match(/^-\s+\*\*(.+?)\*\*\s+-\s+(.+?)\s*$/);
    if (item) out.push({ title: item[1], date: item[2], year });
  }
  return out;
})();

describe('README "Blog Posts" section', () => {
  it('parses into entries', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('lists every post in src/content/blog', () => {
    const listed = new Set(entries.map((e) => normalizeTitle(e.title)));
    const missing = posts
      .filter((p) => !listed.has(normalizeTitle(String(p.data.title))))
      .map((p) => `${p.file} — "${p.data.title}"`);
    expect(missing, 'add these to the README "Blog Posts" section').toEqual([]);
  });

  it('lists no post that does not exist in src/content/blog', () => {
    const real = new Set(posts.map((p) => normalizeTitle(String(p.data.title))));
    const orphans = entries.filter((e) => !real.has(normalizeTitle(e.title))).map((e) => e.title);
    expect(orphans, 'these README entries have no matching markdown file').toEqual([]);
  });

  it('has no duplicate entries', () => {
    const seen = new Map<string, number>();
    for (const e of entries) {
      const k = normalizeTitle(e.title);
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('files every entry under the year its post was published', () => {
    const byTitle = new Map(posts.map((p) => [normalizeTitle(String(p.data.title)), p]));
    const wrong = entries
      .map((e) => ({ e, p: byTitle.get(normalizeTitle(e.title)) }))
      .filter(({ e, p }) => p && (p.data.date as Date).getUTCFullYear() !== e.year)
      .map(({ e, p }) => `"${e.title}" is under ### ${e.year} but dated ${(p!.data.date as Date).toISOString().slice(0, 10)}`);
    expect(wrong).toEqual([]);
  });

  /* Legacy WordPress posts carry a UTC timestamp that lands on the day before
     their filename date (e.g. 2013-09-26-… dated 2013-09-25T22:39Z), and the
     README follows the filename. A one-day window accepts either reading while
     still catching a date that is simply wrong. */
  it("states each entry's date within a day of its frontmatter", () => {
    const byTitle = new Map(posts.map((p) => [normalizeTitle(String(p.data.title)), p]));
    const DAY = 86_400_000;
    const wrong = entries
      .map((e) => ({ e, p: byTitle.get(normalizeTitle(e.title)) }))
      .filter(({ e, p }) => {
        if (!p) return false;
        const stated = Date.parse(`${e.date} UTC`);
        if (isNaN(stated)) return true;
        return Math.abs(stated - +(p.data.date as Date)) > DAY;
      })
      .map(({ e, p }) => {
        const actual = (p!.data.date as Date).toISOString().slice(0, 10);
        return `"${e.title}": README says ${e.date}, frontmatter says ${actual}`;
      });
    expect(wrong).toEqual([]);
  });

  it('orders year headings newest first', () => {
    const years = [...section.matchAll(/^###\s+(\d{4})\s*$/gm)].map((m) => Number(m[1]));
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('orders posts newest first within each year', () => {
    const byTitle = new Map(posts.map((p) => [normalizeTitle(String(p.data.title)), p]));
    const byYear = new Map<number, number[]>();
    for (const e of entries) {
      const p = byTitle.get(normalizeTitle(e.title));
      if (!p) continue;
      byYear.set(e.year, [...(byYear.get(e.year) ?? []), +(p.data.date as Date)]);
    }
    for (const [year, dates] of byYear) {
      expect(dates, `### ${year} is not newest-first`).toEqual([...dates].sort((a, b) => b - a));
    }
  });
});
