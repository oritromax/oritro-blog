import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const BLOG_DIR = join(REPO_ROOT, 'src/content/blog');
export const DIST_DIR = join(REPO_ROOT, 'dist');

export interface RawPost {
  /** filename inside src/content/blog, e.g. `2025-04-01-my-homelab-part-1.md` */
  file: string;
  /** Astro's slug: the filename without extension, NFC-normalized */
  slug: string;
  /** parsed YAML frontmatter, untouched */
  data: Record<string, any>;
  /** markdown body below the frontmatter */
  body: string;
}

/** Every markdown file in the blog collection, sorted by filename. */
export function readPosts(): RawPost[] {
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const { data, content } = matter(readFileSync(join(BLOG_DIR, file), 'utf8'));
      return {
        file,
        slug: file.replace(/\.mdx?$/, '').normalize('NFC'),
        data,
        body: content,
      };
    });
}

/**
 * Loosens the many spellings of the same title so a README entry can be
 * matched against frontmatter: HTML entities, curly quotes, dash variants,
 * Unicode form, and whitespace runs all collapse.
 */
export function normalizeTitle(s: string): string {
  return s
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
