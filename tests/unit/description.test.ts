import { describe, it, expect } from 'vitest';
import {
  SITE_DESCRIPTION,
  META_DESCRIPTION_MAX,
  metaDescription,
  markdownToText,
  excerptFromMarkdown,
  postDescription,
} from '../../src/lib/description';

describe('markdownToText', () => {
  it('keeps link text and drops the URL', () => {
    expect(markdownToText('Read [the docs](https://example.com/a?b=1) first.')).toBe(
      'Read the docs first.'
    );
    expect(markdownToText('See [the guide][guide].\n\n[guide]: https://example.com')).toBe(
      'See the guide.'
    );
  });

  it('drops images entirely, alt text included', () => {
    expect(markdownToText('Before ![a screenshot](/img/shot.png "title") after.')).toBe(
      'Before after.'
    );
    expect(markdownToText('[![badge](/b.svg)](https://ci.example.com) Build status')).toBe(
      'Build status'
    );
  });

  it('skips fenced code blocks, whatever the fence', () => {
    const md = [
      'Install it:',
      '',
      '```bash',
      'sudo pacman -S pipewire # not prose',
      '```',
      '',
      'Then reboot.',
      '',
      '~~~',
      'more code',
      '~~~',
      '',
      'Done.',
    ].join('\n');
    expect(markdownToText(md)).toBe('Install it: Then reboot. Done.');
  });

  it('skips a code fence that is never closed', () => {
    expect(markdownToText('Intro.\n\n```js\nconst a = 1;\n')).toBe('Intro.');
  });

  it('does not treat a longer fence as closed by a shorter one', () => {
    expect(markdownToText('A.\n\n````md\n```\ninner\n```\n````\n\nB.')).toBe('A. B.');
  });

  it('keeps the text of inline code', () => {
    expect(markdownToText('Run `npm test` before committing.')).toBe(
      'Run npm test before committing.'
    );
  });

  it('strips emphasis, strikethrough, and escapes', () => {
    expect(markdownToText('This is **bold**, *italic*, __strong__, _em_ and ~~gone~~.')).toBe(
      'This is bold, italic, strong, em and gone.'
    );
    expect(markdownToText('A literal \\* star and snake_case_name stay.')).toBe(
      'A literal * star and snake_case_name stay.'
    );
  });

  it('drops headings and rules, keeping the prose around them', () => {
    expect(markdownToText('# Title\n\nFirst paragraph.\n\n## Section\n\n---\n\nSecond.')).toBe(
      'First paragraph. Second.'
    );
  });

  it('unwraps blockquotes and list items', () => {
    expect(markdownToText('> quoted line\n\n- one\n- [x] two\n1. three')).toBe(
      'quoted line one two three'
    );
  });

  it('strips HTML tags, comments, and script/style/pre contents', () => {
    const md =
      '<p class="x">Hello <strong>world</strong></p><!-- hidden --><style>p{}</style>' +
      '<pre>code here</pre><img src="/a.png" alt="alt text" /><br>Bye';
    expect(markdownToText(md)).toBe('Hello world Bye');
  });

  it('decodes the entities legacy WordPress bodies carry', () => {
    expect(markdownToText('It&#8217;s &#8220;fine&#8221; &amp; done&nbsp;&hellip; &#x41;')).toBe(
      'It’s “fine” & done … A'
    );
    expect(markdownToText('an &unknown; entity')).toBe('an &unknown; entity');
  });

  it('drops :::aside directive fences but keeps what they wrap', () => {
    expect(markdownToText('Before.\n\n:::aside{label="Note"}\nInside the aside.\n:::\n\nAfter.')).toBe(
      'Before. Inside the aside. After.'
    );
  });

  it('flattens tables to their cell text', () => {
    expect(markdownToText('| Model | FPS |\n| --- | :-: |\n| yolo | 30 |')).toBe(
      'Model FPS yolo 30'
    );
  });

  it('collapses every whitespace run to a single space', () => {
    expect(markdownToText('  one\n\n\ttwo   three\r\n four  ')).toBe('one two three four');
  });

  it('returns an empty string for an empty or markup-only body', () => {
    expect(markdownToText('')).toBe('');
    expect(markdownToText('   \n\n  ')).toBe('');
    expect(markdownToText('![only](/an-image.png)\n\n<img src="/b.png" alt="b" />')).toBe('');
  });
});

describe('excerptFromMarkdown', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

  it('returns short text whole, with no ellipsis', () => {
    expect(excerptFromMarkdown('A short post.')).toBe('A short post.');
  });

  it('returns text of exactly the limit whole', () => {
    const text = 'x'.repeat(75) + ' ' + 'y'.repeat(79);
    expect(text).toHaveLength(155);
    expect(excerptFromMarkdown(text)).toBe(text);
  });

  it('cuts long text at a word boundary and marks the cut with an ellipsis', () => {
    const source = words(60);
    const out = excerptFromMarkdown(source);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(156);

    const kept = out.slice(0, -1);
    expect(source.startsWith(kept)).toBe(true);
    // the next source character is the space that ended the last whole word
    expect(source[kept.length]).toBe(' ');
    // and it kept as many whole words as fit
    expect(kept.length + 1 + source.slice(kept.length + 1).split(' ')[0].length).toBeGreaterThan(155);
  });

  it('keeps a word that ends exactly on the limit', () => {
    const text = 'a'.repeat(155) + ' tail';
    expect(excerptFromMarkdown(text)).toBe('a'.repeat(155) + '…');
  });

  it('does not leave dangling punctuation before the ellipsis', () => {
    const text = 'a'.repeat(150) + ', — ' + 'b'.repeat(40);
    expect(excerptFromMarkdown(text)).toBe('a'.repeat(150) + '…');
  });

  it('hard-cuts a single unbroken run without splitting a surrogate pair', () => {
    const out = excerptFromMarkdown('😀'.repeat(200), 10);
    expect(out).toBe('😀'.repeat(10) + '…');
  });

  it('honours a custom limit', () => {
    expect(excerptFromMarkdown('one two three four five', 9)).toBe('one two…');
  });

  it('measures the limit on the stripped text, not the markdown source', () => {
    const md = `[${'a'.repeat(100)}](https://example.com/${'p'.repeat(300)}) end`;
    expect(excerptFromMarkdown(md)).toBe(`${'a'.repeat(100)} end`);
  });

  it('cuts Bengali text on whitespace too', () => {
    const out = excerptFromMarkdown('বাংলা লেখা '.repeat(40));
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(156);
    expect(out.slice(0, -1).split(' ').every((w) => w === 'বাংলা' || w === 'লেখা')).toBe(true);
  });

  it('is empty for an empty body', () => {
    expect(excerptFromMarkdown('')).toBe('');
  });
});

describe('postDescription', () => {
  it('always prefers the frontmatter description, verbatim', () => {
    expect(postDescription('Written by hand.', 'Body text that would make an excerpt.')).toBe(
      'Written by hand.'
    );
    const long = 'd'.repeat(400);
    expect(postDescription(long, 'body')).toBe(long);
  });

  it('derives one from the body when the frontmatter has none', () => {
    expect(postDescription(undefined, '# Heading\n\nThe **first** paragraph.')).toBe(
      'The first paragraph.'
    );
  });

  it('treats a blank frontmatter description as missing', () => {
    expect(postDescription('   ', 'Body wins.')).toBe('Body wins.');
    expect(postDescription('', 'Body wins.')).toBe('Body wins.');
  });

  it('falls back to the site default when the body yields no text', () => {
    expect(postDescription(undefined, '')).toBe(SITE_DESCRIPTION);
    expect(postDescription(undefined, undefined)).toBe(SITE_DESCRIPTION);
    expect(postDescription(undefined, '![photo](/a.jpg)\n\n```\ncode only\n```')).toBe(
      SITE_DESCRIPTION
    );
  });

  it('produces a generated description that fits the meta cap untouched', () => {
    const generated = postDescription(undefined, 'lorem ipsum dolor '.repeat(100));
    expect(generated.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(metaDescription(generated)).toBe(generated);
  });
});

describe('metaDescription', () => {
  it('caps at 160 characters and leaves shorter text alone', () => {
    expect(metaDescription('x'.repeat(500))).toHaveLength(160);
    expect(metaDescription('short')).toBe('short');
  });
});
