/**
 * Astro ships no ambient declaration for `*.astro` — inside `.astro` files the
 * editor's Astro TS plugin resolves them, but a plain `.ts` test importing a
 * component has nothing to go on.
 *
 * This declaration is deliberately confined to `tests/tsconfig.json` so it
 * cannot shadow the richer, prop-checked types the plugin provides to the app
 * code itself.
 */
declare module '*.astro' {
  const Component: (props: Record<string, any>) => any;
  export default Component;
}
