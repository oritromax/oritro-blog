#!/usr/bin/env node
/**
 * Submits new URLs to IndexNow (Bing, Yandex, Seznam, Naver, …).
 *
 *   npm run indexnow                    # URLs in dist/sitemap-0.xml that the live sitemap lacks
 *   npm run indexnow -- --dry-run       # print what would be sent, POST nothing
 *   npm run indexnow -- <url> [<url>…]  # submit exactly these URLs
 *
 * Deliberately not wired into CI: the URLs must already be live when IndexNow
 * fetches them, and nothing here knows when a deploy has finished.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const HOST = 'ioritro.com';
const KEY = '567ae7b1a53a724d5f793cf4bdac5c34';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const LIVE_SITEMAP = `https://${HOST}/sitemap-0.xml`;
const LOCAL_SITEMAP = new URL('../dist/sitemap-0.xml', import.meta.url);

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Every <loc> in a sitemap, in document order. */
export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => unescapeXml(m[1]));
}

/** URLs in `local` that `live` does not have yet, de-duplicated, order kept. */
export function diffUrls(local, live) {
  const known = new Set(live);
  return [...new Set(local)].filter((url) => !known.has(url));
}

async function fetchLiveUrls() {
  const res = await fetch(LIVE_SITEMAP, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${LIVE_SITEMAP} answered ${res.status}`);
  return sitemapUrls(await res.text());
}

async function newUrls() {
  let local;
  try {
    local = sitemapUrls(await readFile(LOCAL_SITEMAP, 'utf8'));
  } catch {
    throw new Error('dist/sitemap-0.xml not found — run `npm run build` first.');
  }

  let live;
  try {
    live = await fetchLiveUrls();
  } catch (err) {
    /* without the live sitemap there is nothing to diff against, and
       submitting the whole site on a network blip is the wrong default */
    throw new Error(
      `Could not read the live sitemap (${err.message}). ` +
        'Nothing submitted — retry, or pass the URLs explicitly.'
    );
  }
  return diffUrls(local, live);
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const explicit = argv.filter((a) => !a.startsWith('--'));

  const foreign = explicit.filter((u) => {
    try {
      return new URL(u).host !== HOST;
    } catch {
      return true;
    }
  });
  if (foreign.length > 0) {
    throw new Error(`Not absolute https://${HOST}/ URLs: ${foreign.join(', ')}`);
  }

  const urlList = explicit.length > 0 ? [...new Set(explicit)] : await newUrls();
  if (urlList.length === 0) {
    console.log('IndexNow: no new URLs — the live sitemap already has everything in dist/.');
    return;
  }

  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  console.log(`IndexNow: ${urlList.length} URL${urlList.length === 1 ? '' : 's'}`);
  for (const url of urlList) console.log(`  ${url}`);

  if (dryRun) {
    console.log(`\n--dry-run: nothing sent. Would POST to ${ENDPOINT}:`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`IndexNow answered ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  console.log(`IndexNow: accepted (${res.status}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
