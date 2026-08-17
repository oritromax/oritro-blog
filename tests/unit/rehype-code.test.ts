import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { parseHTML } from 'linkedom';
import rehypeCode from '../../src/lib/rehype-code.mjs';

/** Markdown → HTML through the plugin, matching astro.config.mjs's rehype slot. */
const render = (md: string) =>
  unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeCode)
    .use(rehypeStringify)
    .processSync(md)
    .toString();

const dom = (html: string) => parseHTML(`<body>${html}</body>`).document;

const fence = (lang: string, body = 'echo hi') => render('```' + lang + '\n' + body + '\n```');

describe('rehype-code: frame structure', () => {
  const doc = dom(fence('bash'));

  it('wraps the pre in a div.code', () => {
    const frame = doc.querySelector('div.code');
    expect(frame).not.toBeNull();
    expect(frame!.querySelector('pre')).not.toBeNull();
  });

  it('emits the bar before the pre', () => {
    const frame = doc.querySelector('div.code')!;
    const kids = [...frame.children];
    expect(kids).toHaveLength(2);
    expect(kids[0].className).toBe('code-bar');
    expect(kids[1].tagName.toLowerCase()).toBe('pre');
  });

  it('renders the language label and an accessible copy button', () => {
    expect(doc.querySelector('.code-lang')!.textContent).toBe('bash');
    const btn = doc.querySelector('button.code-copy')!;
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-label')).toBe('Copy code to clipboard');
    expect(btn.textContent).toBe('Copy');
  });

  it('preserves the original code content verbatim', () => {
    const doc2 = dom(fence('js', 'const a = 1 < 2 && 3 > 2;'));
    expect(doc2.querySelector('pre code')!.textContent!.trim()).toBe('const a = 1 < 2 && 3 > 2;');
  });

  it('does not nest frames when applied to already-wrapped output', () => {
    expect(dom(fence('bash')).querySelectorAll('div.code')).toHaveLength(1);
  });
});

describe('rehype-code: language detection', () => {
  it('reads the language from the code element class', () => {
    expect(dom(fence('typescript')).querySelector('.code-lang')!.textContent).toBe('typescript');
  });

  it('labels plaintext as "text"', () => {
    expect(dom(fence('plaintext')).querySelector('.code-lang')!.textContent).toBe('text');
  });

  it('falls back to "code" for an unlabelled fence', () => {
    expect(dom(fence('')).querySelector('.code-lang')!.textContent).toBe('code');
  });

  it('prefers Shiki\'s data-language when present', () => {
    // simulates the post-Shiki shape: <pre class="astro-code" data-language="go">
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { className: ['astro-code'], dataLanguage: 'go' },
          children: [{ type: 'text', value: 'package main' }],
        },
      ],
    };
    rehypeCode()(tree as any);
    const frame: any = (tree.children as any[])[0];
    expect(frame.properties.className).toEqual(['code']);
    const label = frame.children[0].children[0];
    expect(label.children[0].value).toBe('go');
  });

  it('wraps a bare astro-code pre with no code child (Shiki plaintext fallback)', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { className: ['astro-code'] },
          children: [{ type: 'text', value: 'raw output' }],
        },
      ],
    };
    rehypeCode()(tree as any);
    expect((tree.children as any[])[0].properties.className).toEqual(['code']);
  });
});

describe('rehype-code: language colour dot', () => {
  const styleOf = (lang: string) =>
    dom(fence(lang)).querySelector('div.code')!.getAttribute('style');

  it.each([
    ['bash', '--c-work'],
    ['sh', '--c-work'],
    ['js', '--c-homelab'],
    ['javascript', '--c-homelab'],
    ['ts', '--c-selfhost'],
    ['go', '--c-codebox'],
    ['python', '--c-codebox'],
    ['yaml', '--c-lecture'],
    ['json', '--c-lecture'],
    ['css', '--c-llm'],
    ['html', '--c-linux'],
    ['astro', '--c-linux'],
    ['sql', '--c-ai'],
  ])('maps %s to %s', (lang, token) => {
    expect(styleOf(lang)).toBe(`--lang-color: var(${token})`);
  });

  it('is case-insensitive on the language name', () => {
    expect(styleOf('BASH')).toBe('--lang-color: var(--c-work)');
  });

  it('omits the style entirely for unmapped languages, letting CSS use the dim default', () => {
    expect(styleOf('rust')).toBeNull();
    expect(styleOf('')).toBeNull();
  });

  it('only ever references category tokens that exist in the palette', () => {
    const palette = ['ai', 'llm', 'homelab', 'selfhost', 'codebox', 'linux', 'work', 'lecture', 'life'];
    for (const lang of ['bash', 'js', 'ts', 'go', 'yaml', 'css', 'html', 'sql']) {
      const token = styleOf(lang)!.match(/var\(--c-(\w+)\)/)![1];
      expect(palette).toContain(token);
    }
  });
});

describe('rehype-code: non-code content', () => {
  it('leaves paragraphs and inline code untouched', () => {
    const html = render('A paragraph with `inline` code.');
    expect(html).not.toContain('class="code"');
    expect(html).toContain('<code>inline</code>');
  });

  it('wraps code blocks nested inside blockquotes and lists', () => {
    const inBlockquote = dom(render('> quoted\n>\n> ```bash\n> ls\n> ```'));
    expect(inBlockquote.querySelector('blockquote div.code')).not.toBeNull();

    const inList = dom(render('- item\n\n  ```bash\n  ls\n  ```'));
    expect(inList.querySelector('li div.code')).not.toBeNull();
  });

  it('wraps every code block in a multi-block document', () => {
    const doc = dom(render('```bash\nls\n```\n\ntext\n\n```go\nmain()\n```'));
    expect(doc.querySelectorAll('div.code')).toHaveLength(2);
    expect([...doc.querySelectorAll('.code-lang')].map((n) => n.textContent)).toEqual([
      'bash',
      'go',
    ]);
  });
});
