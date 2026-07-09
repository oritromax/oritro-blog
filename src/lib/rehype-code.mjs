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
  let lang = 'code';
  if (pre.properties?.dataLanguage) {
    lang = String(pre.properties.dataLanguage);
  } else {
    const cls = codeChild(pre)?.properties?.className || [];
    const found = cls.find((c) => String(c).startsWith('language-'));
    if (found) lang = String(found).slice('language-'.length);
  }
  return lang === 'plaintext' ? 'text' : lang;
}

/* language → category-color token for the bar's identity dot;
   unmapped languages fall back to the dim default in CSS */
const LANG_COLORS = {
  bash: 'work', sh: 'work', shell: 'work', zsh: 'work', console: 'work',
  js: 'homelab', javascript: 'homelab', jsx: 'homelab',
  ts: 'selfhost', typescript: 'selfhost', tsx: 'selfhost',
  go: 'codebox', python: 'codebox', py: 'codebox',
  yaml: 'lecture', yml: 'lecture', json: 'lecture', toml: 'lecture', ini: 'lecture', nginx: 'lecture', conf: 'lecture',
  css: 'llm', scss: 'llm', php: 'llm',
  html: 'linux', xml: 'linux', astro: 'linux', vue: 'linux', svelte: 'linux',
  sql: 'ai',
};

function wrap(pre) {
  const lang = langOf(pre);
  const colorKey = LANG_COLORS[lang.toLowerCase()];
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['code'],
      ...(colorKey ? { style: `--lang-color: var(--c-${colorKey})` } : {}),
    },
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
