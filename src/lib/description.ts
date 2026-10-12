/**
 * Meta descriptions. Most legacy posts have no frontmatter `description`, and
 * without one every such page shipped the same site-wide default — so a
 * description is derived from the post body instead.
 */

/** Site-wide default, used by pages that pass no description of their own. */
export const SITE_DESCRIPTION =
  'Blog and portfolio of Nidal Siddique Oritro — Software Engineer, Engineering Manager. Writing about software, homelab, and building teams and training and Using AI';

/** Hard cap applied to whatever ends up in the description meta tags. */
export const META_DESCRIPTION_MAX = 160;
export const metaDescription = (description: string) => description.slice(0, META_DESCRIPTION_MAX);

/* WordPress-imported bodies are full of these; left alone they would be
   escaped a second time and show up literally in the meta tag */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntity(entity: string, body: string): string {
  if (body[0] !== '#') return ENTITIES[body] ?? entity;
  const code = /^#x/i.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
}

/** Markdown (with the inline HTML legacy posts carry) → one line of plain text. */
export function markdownToText(markdown: string): string {
  return (
    markdown
      // fenced code, including a fence left unclosed at the end of the body
      .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]*\1[`~]*[ \t]*$|(?![\s\S]))/gm, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|pre|figure|iframe)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      // :::aside / ::: directive fences — the content between them is prose
      .replace(/^[ \t]*:::.*$/gm, ' ')
      // headings label a section rather than describe the post
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+.*$/gm, ' ')
      .replace(/^.+\n[ \t]*(?:=+|-+)[ \t]*$/gm, ' ')
      .replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, ' ')
      // reference definitions and table delimiter rows
      .replace(/^[ \t]*\[[^\]]+\]:[ \t]*\S+.*$/gm, ' ')
      .replace(/^(?=.*\|)[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/gm, ' ')
      // images go entirely; links keep their text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      .replace(/<(?:https?:\/\/|mailto:)[^>\s]+>/g, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
      // block markers: quotes, bullets, numbered items, table pipes
      .replace(/^[ \t]*(?:>[ \t]?)+/gm, '')
      .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gm, '')
      .replace(/\|/g, ' ')
      // inline code keeps its text; emphasis markers go
      .replace(/`+([^`]*)`+/g, '$1')
      .replace(/(\*\*\*|\*\*|\*|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/(^|[^\w])(___|__|_)(?=\S)([^_]*?\S)\2(?![\w])/g, '$1$3')
      .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
      .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, decodeEntity)
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * The first `max` characters of a post body as plain text, cut at a word
 * boundary. The ellipsis is added only when something was actually cut.
 */
export function excerptFromMarkdown(markdown: string, max = 155): string {
  const text = markdownToText(markdown);
  if (text.length <= max) return text;

  /* cutting where the next character is a space keeps the last word whole */
  const window = text.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(' ');
  /* a single unbroken run longer than `max` has no boundary — cut on a code
     point so a surrogate pair is never split */
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : [...text].slice(0, max).join('');
  return `${cut.replace(/[\s.,;:!?–—-]+$/, '')}…`;
}

/**
 * Description for a post's meta/OG tags and structured data: the frontmatter
 * one always wins, then an excerpt of the body, then the site default.
 */
export function postDescription(description: string | undefined, body: string | undefined): string {
  return description?.trim() || excerptFromMarkdown(body ?? '') || SITE_DESCRIPTION;
}
