/**
 * Wraps Shiki's <pre class="astro-code"> output in the .code frame:
 * a bar with the language label and a copy button, then the pre itself.
 * The copy button's behavior lives in Layout.astro (event delegation).
 */
function codeChild(pre) {
  return pre.children?.find((c) => c.type === 'element' && c.tagName === 'code');
}

/* user rehype plugins run BEFORE Astro's Shiki pass, so match the raw
   <pre><code class="language-…"> markdown output */
function isCodePre(node) {
  if (node.type !== 'element' || node.tagName !== 'pre') return false;
  return !!codeChild(node) || (node.properties?.className || []).includes('astro-code');
}

function langOf(pre) {
  if (pre.properties?.dataLanguage) return String(pre.properties.dataLanguage);
  const cls = codeChild(pre)?.properties?.className || [];
  const lang = cls.find((c) => String(c).startsWith('language-'));
  return lang ? String(lang).slice('language-'.length) : 'code';
}

function wrap(pre) {
  const lang = langOf(pre);
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['code'] },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-bar'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['code-lang'] },
            children: [{ type: 'text', value: String(lang) }],
          },
          {
            type: 'element',
            tagName: 'button',
            properties: {
              type: 'button',
              className: ['code-copy'],
              'aria-label': 'Copy code to clipboard',
            },
            children: [{ type: 'text', value: 'Copy' }],
          },
        ],
      },
      pre,
    ],
  };
}

export default function rehypeCode() {
  return (tree) => {
    const visit = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) =>
        isCodePre(child) ? wrap(child) : (visit(child), child)
      );
    };
    visit(tree);
  };
}
