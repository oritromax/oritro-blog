import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseHTML } from 'linkedom';
import { DIST_DIR } from './posts';

export { DIST_DIR };

export function requireDist(): void {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error(
      'dist/ is missing or empty. Build first:  npm run build  (or use `npm run test:build`).'
    );
  }
}

/** Every file under dist/, as paths relative to dist with forward slashes. */
export function distFiles(dir = DIST_DIR): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...distFiles(full));
    else out.push(relative(DIST_DIR, full).split(sep).join('/'));
  }
  return out;
}

/** Every built HTML page, keyed by its site route (`/`, `/blog/x/`, …). */
export function htmlPages(): { route: string; file: string }[] {
  return distFiles()
    .filter((f) => f.endsWith('.html'))
    .map((file) => ({
      file,
      route: '/' + file.replace(/index\.html$/, '').replace(/\.html$/, ''),
    }));
}

export const readDist = (file: string) => readFileSync(join(DIST_DIR, file), 'utf8');

export const docOf = (file: string) => parseHTML(readDist(file)).document;

/**
 * Resolves a site-absolute href to the dist file that would serve it, or
 * `null` if nothing would. Mirrors static-host behaviour: `/x/` → `x/index.html`,
 * `/x` → `x.html` or `x/index.html`.
 */
export function resolveRoute(href: string, files: Set<string>): string | null {
  let path = href.split('#')[0].split('?')[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    return null; // malformed percent-encoding can never resolve
  }
  path = path.replace(/^\//, '').normalize('NFC');
  if (path === '') path = 'index.html';

  const candidates = path.endsWith('/')
    ? [`${path}index.html`]
    : [path, `${path}/index.html`, `${path}.html`];

  return candidates.find((c) => files.has(c)) ?? null;
}

/** Site-internal links and asset references on a page. */
export function internalRefs(file: string): { attr: string; value: string }[] {
  const doc = docOf(file);
  const out: { attr: string; value: string }[] = [];

  const collect = (selector: string, attr: string) => {
    for (const el of doc.querySelectorAll(selector)) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      // skip protocol/scheme URLs, fragments, and inline data
      if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(value)) continue;
      out.push({ attr, value });
    }
  };

  collect('a[href]', 'href');
  collect('img[src]', 'src');
  collect('link[href]', 'href');
  collect('script[src]', 'src');
  return out;
}
