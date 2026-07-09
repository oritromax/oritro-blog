/**
 * Turns the `:::aside{label="Learn from my pain"}` directive into
 * <div class="aside"><span class="aside-label">…</span>…</div>.
 * Requires remark-directive to run before it.
 */
function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((child) => walk(child, fn));
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function remarkAside() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'containerDirective' || node.name !== 'aside') return;
      const data = node.data || (node.data = {});
      data.hName = 'div';
      data.hProperties = { className: ['aside'] };
      const label = node.attributes?.label;
      if (label) {
        node.children.unshift({
          type: 'html',
          value: `<span class="aside-label">${escapeHtml(label)}</span>`,
        });
      }
    });
  };
}
