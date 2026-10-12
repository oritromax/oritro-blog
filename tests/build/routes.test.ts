import { describe, it, expect, beforeAll } from 'vitest';
import { distFiles, htmlPages, readDist, requireDist, resolveRoute } from '../helpers/dist';
import { readPosts } from '../helpers/posts';
import { categorySlug, tagSlug } from '../../src/lib/category';

beforeAll(requireDist);

const posts = readPosts();
const files = new Set(distFiles());
const POSTS_PER_PAGE = 10;

describe('static pages', () => {
  it.each(['/', '/portfolio', '/contact', '/consultation', '/categories', '/archive', '/blog'])(
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

  it('does not build /page/1 — page 1 lives at /', () => {
    expect(resolveRoute('/page/1/', files)).toBeNull();
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

  /* case and spacing variants ("AI"/"ai", "Name server"/"name-server") must
     land on one page, not split it */
  it('builds lowercase, whitespace-free directories only', () => {
    const bad = [...files]
      .filter((f) => f.startsWith('tag/'))
      .map((f) => f.slice('tag/'.length).split('/')[0])
      .filter((d) => d !== d.toLowerCase() || /\s/.test(d));
    expect(bad).toEqual([]);
  });
});

describe('assets and sitemap', () => {
  const sitemapXml = () =>
    [...files]
      .filter((f) => /^sitemap-\d+\.xml$/.test(f))
      .map(readDist)
      .join('');
  const sitemapLocs = () => [...sitemapXml().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('emits the sitemap index and at least one sitemap', () => {
    expect(files.has('sitemap-index.xml')).toBe(true);
    expect([...files].some((f) => /^sitemap-\d+\.xml$/.test(f))).toBe(true);
  });

  it('lists every post in the sitemap under the production origin', () => {
    const xml = sitemapXml();
    const missing = posts.filter((p) => !xml.includes(`/blog/${encodeURI(p.slug)}/`));
    expect(missing.map((p) => p.slug)).toEqual([]);
    expect(xml).toContain('<loc>https://ioritro.com/</loc>');
    expect(xml).not.toContain('localhost');
  });

  /* tag and pagination pages are noindex, /blog/ is a redirect stub —
     listing them would ask crawlers to index what the pages say not to */
  it('leaves tag pages, pagination pages, and the /blog/ stub out of the sitemap', () => {
    const paths = sitemapLocs().map((loc) => new URL(loc).pathname);
    expect(paths.filter((p) => p.startsWith('/tag/'))).toEqual([]);
    expect(paths.filter((p) => p.startsWith('/page/'))).toEqual([]);
    expect(paths).not.toContain('/blog/');
  });

  it('lists the archive page', () => {
    expect(sitemapLocs()).toContain('https://ioritro.com/archive/');
  });

  it('still lists the category pages', () => {
    expect(sitemapLocs().some((loc) => new URL(loc).pathname.startsWith('/category/'))).toBe(true);
  });

  it('stamps each post with its frontmatter date as lastmod, and nothing else', () => {
    const entries = [...sitemapXml().matchAll(/<url>(.*?)<\/url>/gs)].map((m) => ({
      path: decodeURI(new URL(m[1].match(/<loc>([^<]+)<\/loc>/)![1]).pathname).normalize('NFC'),
      lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
    }));
    for (const post of posts) {
      const entry = entries.find((e) => e.path === `/blog/${post.slug}/`);
      expect(entry?.lastmod, `${post.slug} has the wrong lastmod`).toBe(
        new Date(post.data.date).toISOString()
      );
    }
    expect(entries.filter((e) => e.lastmod && !e.path.startsWith('/blog/'))).toEqual([]);
  });

  it('ships the avatar and favicon referenced by the layout', () => {
    expect(files.has('blog-avatar-final.jpg')).toBe(true);
    expect(files.has('favicon.png')).toBe(true);
  });

  it('builds a reasonable number of pages', () => {
    expect(htmlPages().length).toBeGreaterThan(posts.length);
  });
});

/* Content Signals (contentsignals.org): search and AI answers may use the
   content, model training may not. Training crawlers get no group of their
   own — an explicit Allow would contradict ai-train=no, and `*` covers them. */
const CONTENT_SIGNAL = 'Content-Signal: ai-train=no, search=yes, ai-input=yes';
const SEARCH_BOTS = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'];
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended'];

/** robots.txt groups, keyed by user agent, each holding its rule lines. */
function robotsGroups(robots: string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  let rules: string[] | undefined;
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    const agent = line.match(/^User-agent:\s*(.+)$/i);
    if (agent) {
      rules = [];
      groups.set(agent[1], rules);
    } else if (/^Sitemap:/i.test(line)) {
      rules = undefined;
    } else if (line && rules) {
      rules.push(line);
    }
  }
  return groups;
}

describe('discovery files', () => {
  it('ships a robots.txt that allows crawling and points at the sitemap', () => {
    expect(files.has('robots.txt')).toBe(true);
    const robots = readDist('robots.txt');
    expect(robotsGroups(robots).get('*')).toContain('Allow: /');
    expect(robots).toMatch(/^Sitemap: https:\/\/ioritro\.com\/sitemap-index\.xml$/m);
    expect(robots.trimEnd().split('\n').at(-1)).toBe('Sitemap: https://ioritro.com/sitemap-index.xml');
    expect(robots).not.toMatch(/^Disallow: \S/m);
  });

  it('declares its Content Signals in the * group of robots.txt', () => {
    const robots = readDist('robots.txt');
    expect(robots).toMatch(/^User-agent: \*\nContent-Signal: ai-train=no, search=yes, ai-input=yes\nAllow: \/$/m);
    expect(robotsGroups(robots).get('*')).toEqual([CONTENT_SIGNAL, 'Allow: /']);
  });

  it.each(SEARCH_BOTS)('explicitly allows %s in robots.txt, under the same signals', (bot) => {
    const robots = readDist('robots.txt');
    expect(robots).toContain(`User-agent: ${bot}\n${CONTENT_SIGNAL}\nAllow: /`);
    expect(robotsGroups(robots).get(bot)).toEqual([CONTENT_SIGNAL, 'Allow: /']);
  });

  it('never states a Content-Signal other than the site policy', () => {
    const signals = readDist('robots.txt').match(/^Content-Signal:.*$/gim) ?? [];
    expect(signals).toHaveLength(SEARCH_BOTS.length + 1);
    expect(signals.filter((s) => s !== CONTENT_SIGNAL)).toEqual([]);
  });

  it.each(TRAINING_BOTS)('gives the training crawler %s no group of its own in robots.txt', (bot) => {
    const robots = readDist('robots.txt');
    expect(robotsGroups(robots).has(bot)).toBe(false);
    expect(robots).not.toMatch(new RegExp(`^User-agent:\\s*${bot}\\s*$`, 'im'));
  });

  it('ships an RSS feed with one item per post, newest first', () => {
    expect(files.has('rss.xml')).toBe(true);
    const xml = readDist('rss.xml');
    expect(xml.match(/<item>/g) ?? []).toHaveLength(posts.length);

    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => Date.parse(m[1]));
    expect(dates).toHaveLength(posts.length);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('links every RSS item to a built post, by its canonical trailing-slash URL', () => {
    const links = [...readDist('rss.xml').matchAll(/<item>.*?<link>([^<]+)<\/link>/gs)].map((m) => m[1]);
    expect(links).toHaveLength(posts.length);
    const bad = links.filter(
      (l) =>
        !l.startsWith('https://ioritro.com/blog/') ||
        !l.endsWith('/') ||
        !resolveRoute(new URL(l).pathname, files)
    );
    expect(bad).toEqual([]);
  });

  /* postHref already ends in a slash — an endpoint appending its own would
     emit `/blog/x//`, which still resolves on most hosts and so hides well */
  it('never doubles a slash in an RSS or llms.txt link', () => {
    const rss = [...readDist('rss.xml').matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1]);
    const llms = [...readDist('llms.txt').matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(rss.length).toBeGreaterThan(posts.length);
    expect(llms.length).toBeGreaterThan(0);
    expect([...rss, ...llms].filter((l) => new URL(l).pathname.includes('//'))).toEqual([]);
    expect(llms.filter((l) => !l.endsWith('/'))).toEqual([]);
  });

  it('does not emit the feed or llms.txt as an HTML page', () => {
    expect(htmlPages().filter((p) => /rss|llms/.test(p.route))).toEqual([]);
  });

  it('ships an llms.txt whose links are all absolute production URLs that resolve', () => {
    expect(files.has('llms.txt')).toBe(true);
    const txt = readDist('llms.txt');
    expect(txt).toMatch(/^# \S/);
    expect(txt).toContain('\n## Posts\n');
    expect(txt).toContain('\n## Pages\n');

    const links = [...txt.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(links).toHaveLength(Math.min(15, posts.length) + 4);
    expect(links.filter((l) => !l.startsWith('https://ioritro.com/'))).toEqual([]);
    expect(links.filter((l) => !resolveRoute(new URL(l).pathname, files))).toEqual([]);
  });

  it('ships the IndexNow key file, containing exactly the key', () => {
    const key = '567ae7b1a53a724d5f793cf4bdac5c34';
    expect(files.has(`${key}.txt`)).toBe(true);
    expect(readDist(`${key}.txt`)).toBe(key);
  });
});

