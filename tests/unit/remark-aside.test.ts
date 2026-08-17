import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { parseHTML } from 'linkedom';
import remarkAside from '../../src/lib/remark-aside.mjs';

/**
 * Mirrors the pipeline order in astro.config.mjs: remark-directive runs
 * first so `:::aside` has already become a containerDirective node by the
 * time remark-aside sees it. `allowDangerousHtml` + rehype-raw stand in for
 * Astro's handling of the raw `<span>` the plugin injects.
 */
const render = (md: string) =>
  unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkAside)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(md)
    .toString();

const dom = (html: string) => parseHTML(`<body>${html}</body>`).document;

/** Runs the plugin over a hand-built mdast directive node, no pipeline. */
const applyTo = (attributes: Record<string, string>) => {
  const node: any = {
    type: 'containerDirective',
    name: 'aside',
    attributes,
    children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Body' }] }],
  };
  remarkAside()({ type: 'root', children: [node] } as any);
  return node;
};

describe('remark-aside: node transformation', () => {
  it('sets the hast element name and class', () => {
    const node = applyTo({});
    expect(node.data.hName).toBe('div');
    expect(node.data.hProperties).toEqual({ className: ['aside'] });
  });

  it('escapes every dangerous character in the raw label span', () => {
    const node = applyTo({ label: '<b>a</b> & "q"' });
    expect(node.children[0]).toEqual({
      type: 'html',
      value: '<span class="aside-label">&lt;b&gt;a&lt;/b&gt; &amp; &quot;q&quot;</span>',
    });
  });

  it('escapes ampersands before the entities they introduce', () => {
    // naive ordering would turn `&lt;` into `&amp;lt;`-then-`&lt;` and leak a tag
    expect(applyTo({ label: '&lt;script&gt;' }).children[0].value).toBe(
      '<span class="aside-label">&amp;lt;script&amp;gt;</span>'
    );
  });

  it('preserves the existing data object rather than replacing it', () => {
    const node: any = {
      type: 'containerDirective',
      name: 'aside',
      attributes: {},
      data: { existing: true },
      children: [],
    };
    remarkAside()({ type: 'root', children: [node] } as any);
    expect(node.data.existing).toBe(true);
    expect(node.data.hName).toBe('div');
  });
});

describe('remark-aside', () => {
  it('turns :::aside into a div.aside', () => {
    const html = render(':::aside\nWatch out for this.\n:::');
    expect(html).toContain('<div class="aside">');
    expect(html).toContain('Watch out for this.');
    expect(html).not.toContain(':::');
  });

  it('renders the label attribute as the first child', () => {
    const html = render(':::aside{label="Learn from my pain"}\nBody text.\n:::');
    expect(html).toContain('<span class="aside-label">Learn from my pain</span>');
    const labelAt = html.indexOf('aside-label');
    const bodyAt = html.indexOf('Body text.');
    expect(labelAt).toBeGreaterThan(-1);
    expect(labelAt).toBeLessThan(bodyAt);
  });

  it('omits the label span when no label is given', () => {
    expect(render(':::aside\nNo label.\n:::')).not.toContain('aside-label');
  });

  it('escapes HTML in the label so a label cannot inject live markup', () => {
    const html = render(':::aside{label="<img src=x onerror=alert(1)> & co"}\nBody\n:::');
    expect(html).toContain('class="aside-label"');
    // the tag survives only as escaped text, never as a real element
    expect(html).not.toContain('<img');
    expect(html).toContain('&#x3C;img');
    expect(html).toContain('&#x26;');
    expect(dom(html).querySelector('img')).toBeNull();
  });

  it('keeps markdown inside the aside rendered as markdown', () => {
    const html = render(':::aside{label="Note"}\nSome **bold** and a [link](/x).\n:::');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="/x">link</a>');
  });

  it('handles multiple asides in one document', () => {
    const html = render(
      ':::aside{label="One"}\nFirst\n:::\n\nBetween\n\n:::aside{label="Two"}\nSecond\n:::'
    );
    expect(html.match(/class="aside"/g)).toHaveLength(2);
    expect(html).toContain('>One<');
    expect(html).toContain('>Two<');
  });

  it('processes asides nested inside other container directives', () => {
    const html = render(':::wrapper\n::::aside{label="Deep"}\nNested\n::::\n:::');
    expect(html).toContain('class="aside"');
    expect(html).toContain('>Deep<');
  });

  it('leaves other container directives alone', () => {
    const html = render(':::note\nNot an aside.\n:::');
    expect(html).not.toContain('class="aside"');
  });

  it('leaves ordinary paragraphs untouched', () => {
    const html = render('Just a paragraph.');
    expect(html.trim()).toBe('<p>Just a paragraph.</p>');
  });
});
