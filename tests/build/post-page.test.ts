import { describe, it, expect, beforeAll } from 'vitest';
import { docOf, distFiles, requireDist } from '../helpers/dist';
import { readPosts, type RawPost } from '../helpers/posts';
import { postHref } from '../../src/lib/category';
import { relatedPosts, postNeighbors, chronological } from '../../src/lib/related';

beforeAll(requireDist);

const posts = readPosts();
const files = new Set(distFiles());
const pageOf = (slug: string) => docOf(`blog/${slug}/index.html`);

/** gray-matter parses `date:` to a Date already — the shape src/lib/related reads. */
const linkable = posts.map((p) => ({
  ...p,
  data: { ...p.data, date: new Date(p.data.date) } as RawPost['data'] & { date: Date },
}));
const linkableBySlug = new Map(linkable.map((p) => [p.slug, p]));

/** A post with categories, tags, a description, code, and h2/h3 headings. */
const RICH = '2026-05-18-fixing-the-elgato-wave-3-on-cachyos-kde';

describe('every post page', () => {
  const docs = posts
    .filter((p) => files.has(`blog/${p.slug}/index.html`))
    .map((p) => [p.slug, pageOf(p.slug), p] as const);

  /* Scoped to the template's own h1. Some legacy WordPress-imported bodies open
     with a `# Heading` of their own, which is a content backlog rather than a
     template regression. */
  it('renders exactly one h1 outside the prose, matching the post title', () => {
    const bad = docs.filter(([, doc, p]) => {
      const h1s = [...doc.querySelectorAll('h1')].filter((h) => !h.closest('.prose'));
      return h1s.length !== 1 || h1s[0].textContent!.trim() !== String(p.data.title).trim();
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('renders the article body', () => {
    const bad = docs.filter(([, doc]) => doc.querySelector('article.post-body .prose') === null);
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('leaves no unprocessed ::: directive in the rendered prose', () => {
    const bad = docs.filter(([, doc]) => /:::/.test(doc.querySelector('.prose')?.textContent ?? ''));
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('renders a back link, breadcrumb, and share controls', () => {
    const bad = docs.filter(
      ([, doc]) =>
        !doc.querySelector('a.hero-back') ||
        !doc.querySelector('nav.post-hero-crumbs') ||
        !doc.querySelector('#share-copy')
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('renders a reading time and a machine-readable published date', () => {
    const bad = docs.filter(([, doc, p]) => {
      const meta = doc.querySelector('.post-hero-meta')?.textContent ?? '';
      const time = doc.querySelector('.post-hero-meta time')?.getAttribute('datetime');
      return !/\d+ min read/.test(meta) || time !== (p.data.date as Date).toISOString();
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('sets the page-level --cat channel on the body', () => {
    const bad = docs.filter(([, doc]) => !/--cat:\s*var\(--c-\w+\)/.test(doc.body.getAttribute('style') ?? ''));
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('shows the author byline', () => {
    const bad = docs.filter(([, doc, p]) => doc.querySelector('.author-name')?.textContent !== (p.data.author ?? 'Oritro Ahmed'));
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('links up to three related posts, never to itself', () => {
    const bad = docs.filter(([slug, doc]) => {
      const links = [...doc.querySelectorAll('.related-card')].map((a) => a.getAttribute('href'));
      return links.length > 3 || links.includes(postHref(slug)) || links.includes(`/blog/${slug}`);
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('fills all three related slots, with three different posts', () => {
    const want = Math.min(3, posts.length - 1);
    const bad = docs.filter(([, doc]) => {
      const links = [...doc.querySelectorAll('.related-card')].map((a) => a.getAttribute('href'));
      return links.length !== want || new Set(links).size !== links.length;
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  /* the ranking itself is unit-tested; this checks the page is wired to it
     rather than to "three newest" */
  it('picks the related posts by relevance, in ranked order', () => {
    const bad = docs.filter(([, doc, p]) => {
      const links = [...doc.querySelectorAll('.related-card')].map((a) => a.getAttribute('href'));
      const expected = relatedPosts(linkableBySlug.get(p.slug)!, linkable, 3).map((r) => postHref(r.slug));
      return JSON.stringify(links) !== JSON.stringify(expected);
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('renders the summary box only for a frontmatter description, never a generated one', () => {
    const bad = docs.filter(([, doc, p]) => {
      const summary = doc.querySelector('.summary');
      const real = typeof p.data.description === 'string' && p.data.description.trim() !== '';
      if (!real) return summary !== null;
      return !summary?.textContent?.includes(p.data.description.trim());
    });
    expect(bad.map(([slug]) => slug)).toEqual([]);
    expect(docs.some(([, doc]) => doc.querySelector('.summary') === null)).toBe(true);
  });

  it('never renders an empty chip or tag', () => {
    const bad = docs.filter(([, doc]) =>
      [...doc.querySelectorAll('.chip, .tag')].some((el) => !el.textContent!.trim())
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });
});

describe('prev/next navigation', () => {
  const navOf = (slug: string) => pageOf(slug).querySelector('nav[aria-label="Posts navigation"]');
  const link = (slug: string, rel: 'prev' | 'next') =>
    navOf(slug)?.querySelector(`a[rel="${rel}"]`) ?? null;
  const built = linkable.filter((p) => files.has(`blog/${p.slug}/index.html`));
  const ordered = chronological(built);

  it('renders one labelled nav on every post', () => {
    const bad = built.filter(
      (p) => pageOf(p.slug).querySelectorAll('nav[aria-label="Posts navigation"]').length !== 1
    );
    expect(bad.map((p) => p.slug)).toEqual([]);
  });

  it('links the older and newer post by date, titled with the neighbour title', () => {
    const bad: string[] = [];
    for (const p of built) {
      const { older, newer } = postNeighbors(p, built);
      for (const [rel, neighbour] of [['prev', older], ['next', newer]] as const) {
        const a = link(p.slug, rel);
        if (!neighbour) {
          if (a) bad.push(`${p.slug}: unexpected ${rel} link`);
          continue;
        }
        if (a?.getAttribute('href') !== postHref(neighbour.slug)) {
          bad.push(`${p.slug}: ${rel} → ${a?.getAttribute('href')}, expected ${postHref(neighbour.slug)}`);
        } else if (a.querySelector('.post-nav-title')?.textContent !== String(neighbour.data.title)) {
          bad.push(`${p.slug}: ${rel} link is not titled "${neighbour.data.title}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives the oldest post no prev link and the newest no next link', () => {
    const oldest = ordered[0].slug;
    const newest = ordered.at(-1)!.slug;
    expect(link(oldest, 'prev')).toBeNull();
    expect(link(oldest, 'next')).not.toBeNull();
    expect(link(newest, 'next')).toBeNull();
    expect(link(newest, 'prev')).not.toBeNull();
  });

  it('chains every post into one walk from oldest to newest', () => {
    const walked: string[] = [];
    let slug: string | undefined = ordered[0].slug;
    while (slug && walked.length <= ordered.length) {
      walked.push(slug);
      const next: string | null | undefined = link(slug, 'next')?.getAttribute('href');
      slug = next ? decodeURI(next).slice('/blog/'.length, -1) : undefined;
    }
    expect(walked).toEqual(ordered.map((p) => p.slug));
  });

  it('never links a post to itself', () => {
    const bad = built.filter((p) =>
      [...(navOf(p.slug)?.querySelectorAll('a') ?? [])].some((a) => a.getAttribute('href') === postHref(p.slug))
    );
    expect(bad.map((p) => p.slug)).toEqual([]);
  });
});

describe('a representative rich post', () => {
  const doc = pageOf(RICH);

  it('exists', () => {
    expect(files.has(`blog/${RICH}/index.html`)).toBe(true);
  });

  it('renders a table of contents from h2/h3 headings', () => {
    const toc = doc.querySelector('nav.toc');
    expect(toc).not.toBeNull();
    const targets = [...toc!.querySelectorAll('a[data-toc]')].map((a) => a.getAttribute('data-toc'));
    expect(targets.length).toBeGreaterThan(1);
    for (const id of targets) {
      expect(doc.getElementById(id!), `TOC points at missing #${id}`).not.toBeNull();
    }
  });

  it('gives every heading in the prose an id to anchor to', () => {
    const headings = [...doc.querySelectorAll('.prose h2, .prose h3')];
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.filter((h) => !h.getAttribute('id'))).toEqual([]);
  });

  it('renders the summary block from the description', () => {
    expect(doc.querySelector('.summary')).not.toBeNull();
  });

  it('renders category chips and tag pills that link out', () => {
    expect(doc.querySelectorAll('.post-hero-meta .chip').length).toBeGreaterThan(0);
    const tags = [...doc.querySelectorAll('.post-footer .tag')];
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t.getAttribute('href')).toMatch(/^\/tag\//);
  });
});

describe('code blocks', () => {
  const withCode = posts
    .filter((p) => /^\s*```/m.test(p.body) && files.has(`blog/${p.slug}/index.html`))
    .map((p) => [p.slug, pageOf(p.slug)] as const);

  it('has posts containing code to check', () => {
    expect(withCode.length).toBeGreaterThan(5);
  });

  it('wraps every pre in the .code frame', () => {
    const bad = withCode.filter(([, doc]) =>
      [...doc.querySelectorAll('.prose pre')].some((pre) => !pre.parentElement?.classList.contains('code'))
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('gives every frame a language label and a copy button', () => {
    const bad = withCode.filter(([, doc]) =>
      [...doc.querySelectorAll('.prose .code')].some(
        (frame) =>
          !frame.querySelector('.code-bar .code-lang')?.textContent?.trim() ||
          !frame.querySelector('button.code-copy')
      )
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('never nests one code frame inside another', () => {
    const bad = withCode.filter(([, doc]) => doc.querySelector('.code .code') !== null);
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('highlights code with the custom theme rather than leaving it plain', () => {
    const bad = withCode.filter(
      ([, doc]) => !doc.querySelector('.prose pre.astro-code')
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('labels plaintext fences as "text", never as "plaintext"', () => {
    const bad = withCode.filter(([, doc]) =>
      [...doc.querySelectorAll('.code-lang')].some((l) => l.textContent!.trim() === 'plaintext')
    );
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });
});

describe('asides', () => {
  const withAside = posts
    .filter((p) => /^:::aside/m.test(p.body) && files.has(`blog/${p.slug}/index.html`))
    .map((p) => [p.slug, pageOf(p.slug)] as const);

  it('renders every :::aside as a div.aside', () => {
    if (withAside.length === 0) return; // no asides in the corpus yet
    const bad = withAside.filter(([, doc]) => doc.querySelector('.prose div.aside') === null);
    expect(bad.map(([slug]) => slug)).toEqual([]);
  });

  it('renders the label as the first child of the aside', () => {
    for (const [slug, doc] of withAside) {
      for (const aside of doc.querySelectorAll('div.aside')) {
        const label = aside.querySelector('.aside-label');
        if (!label) continue;
        expect(aside.firstElementChild, `${slug}: label is not first`).toBe(label);
      }
    }
  });
});
